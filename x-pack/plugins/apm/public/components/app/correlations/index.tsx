/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiPortal,
  EuiCode,
  EuiLink,
  EuiCallOut,
  EuiButton,
  EuiTab,
  EuiTabs,
  EuiSpacer,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { MlLatencyCorrelations } from './ml_latency_correlations';
import { ErrorCorrelations } from './error_correlations';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { createHref } from '../../shared/Links/url_helpers';
import {
  METRIC_TYPE,
  useTrackMetric,
} from '../../../../../observability/public';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { LicensePrompt } from '../../shared/license_prompt';
import { IUrlParams } from '../../../context/url_params_context/types';
import {
  IStickyProperty,
  StickyProperties,
} from '../../shared/sticky_properties';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';

const errorRateTab = {
  key: 'errorRate',
  label: i18n.translate('xpack.apm.correlations.tabs.errorRateLabel', {
    defaultMessage: 'Failed transaction rate',
  }),
  component: ErrorCorrelations,
};
const latencyCorrelationsTab = {
  key: 'latencyCorrelations',
  label: i18n.translate('xpack.apm.correlations.tabs.latencyLabel', {
    defaultMessage: 'Latency',
  }),
  component: MlLatencyCorrelations,
};
const tabs = [latencyCorrelationsTab, errorRateTab];

export function Correlations() {
  const license = useLicenseContext();
  const hasActivePlatinumLicense = isActivePlatinumLicense(license);
  const { urlParams } = useUrlParams();
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment },
  } = useApmParams('/services/:serviceName');

  const history = useHistory();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState(latencyCorrelationsTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? latencyCorrelationsTab;
  const metric = {
    app: 'apm' as const,
    metric: hasActivePlatinumLicense
      ? 'correlations_flyout_view'
      : 'correlations_license_prompt',
    metricType: METRIC_TYPE.COUNT as METRIC_TYPE.COUNT,
  };
  useTrackMetric(metric);
  useTrackMetric({ ...metric, delay: 15000 });

  const stickyProperties: IStickyProperty[] = useMemo(() => {
    const properties: IStickyProperty[] = [];
    if (serviceName !== undefined) {
      properties.push({
        label: i18n.translate('xpack.apm.correlations.serviceLabel', {
          defaultMessage: 'Service',
        }),
        fieldName: SERVICE_NAME,
        val: serviceName,
        width: '20%',
      });
    }

    properties.push({
      label: i18n.translate('xpack.apm.correlations.environmentLabel', {
        defaultMessage: 'Environment',
      }),
      fieldName: SERVICE_ENVIRONMENT,
      val: getEnvironmentLabel(environment),
      width: '20%',
    });

    if (urlParams.transactionName) {
      properties.push({
        label: i18n.translate('xpack.apm.correlations.transactionLabel', {
          defaultMessage: 'Transaction',
        }),
        fieldName: TRANSACTION_NAME,
        val: urlParams.transactionName,
        width: '20%',
      });
    }

    return properties;
  }, [serviceName, environment, urlParams.transactionName]);

  return (
    <>
      <EuiButton
        data-test-subj="apmViewCorrelationsButton"
        fill
        onClick={() => {
          setIsFlyoutVisible(true);
        }}
      >
        {i18n.translate('xpack.apm.correlations.buttonLabel', {
          defaultMessage: 'View correlations',
        })}
      </EuiButton>

      {isFlyoutVisible && (
        <EuiPortal>
          <EuiFlyout
            data-test-subj="apmCorrelationsFlyout"
            size="l"
            ownFocus
            onClose={() => setIsFlyoutVisible(false)}
          >
            <EuiFlyoutHeader hasBorder aria-labelledby="correlations-flyout">
              <EuiTitle>
                <h2
                  data-test-subj="apmCorrelationsFlyoutHeader"
                  id="correlations-flyout"
                >
                  {CORRELATIONS_TITLE}
                  &nbsp;
                  <EuiBetaBadge
                    label={i18n.translate('xpack.apm.correlations.betaLabel', {
                      defaultMessage: 'Beta',
                    })}
                    title={CORRELATIONS_TITLE}
                    tooltipContent={i18n.translate(
                      'xpack.apm.correlations.betaDescription',
                      {
                        defaultMessage:
                          'Correlations is not GA. Please help us by reporting any bugs.',
                      }
                    )}
                  />
                </h2>
              </EuiTitle>
              {hasActivePlatinumLicense && (
                <>
                  <EuiSpacer size="m" />
                  <StickyProperties stickyProperties={stickyProperties} />

                  {urlParams.kuery ? (
                    <>
                      <EuiSpacer size="m" />
                      <Filters urlParams={urlParams} history={history} />
                    </>
                  ) : (
                    <EuiSpacer size="s" />
                  )}
                  <EuiTabs style={{ marginBottom: '-25px' }}>
                    {tabs.map(({ key, label }) => (
                      <EuiTab
                        key={key}
                        isSelected={key === currentTab}
                        onClick={() => {
                          setCurrentTab(key);
                        }}
                      >
                        {label}
                      </EuiTab>
                    ))}
                  </EuiTabs>
                </>
              )}
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              {hasActivePlatinumLicense ? (
                <>
                  <TabContent onClose={() => setIsFlyoutVisible(false)} />
                </>
              ) : (
                <LicensePrompt
                  text={i18n.translate(
                    'xpack.apm.correlations.licenseCheckText',
                    {
                      defaultMessage: `To use correlations, you must be subscribed to an Elastic Platinum license. With it, you'll be able to discover which fields are correlated with poor performance.`,
                    }
                  )}
                />
              )}
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      )}
    </>
  );
}

function Filters({
  urlParams,
  history,
}: {
  urlParams: IUrlParams;
  history: ReturnType<typeof useHistory>;
}) {
  if (!urlParams.kuery) {
    return null;
  }

  return (
    <EuiCallOut size="s">
      <span>
        {i18n.translate('xpack.apm.correlations.filteringByLabel', {
          defaultMessage: 'Filtering by',
        })}
      </span>
      <EuiCode>{urlParams.kuery}</EuiCode>
      <EuiLink href={createHref(history, { query: { kuery: '' } })}>
        <EuiButtonEmpty size="xs" iconType="cross">
          {i18n.translate('xpack.apm.correlations.clearFiltersLabel', {
            defaultMessage: 'Clear',
          })}
        </EuiButtonEmpty>
      </EuiLink>
    </EuiCallOut>
  );
}

const CORRELATIONS_TITLE = i18n.translate('xpack.apm.correlations.title', {
  defaultMessage: 'Correlations',
});
