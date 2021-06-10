/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { LatencyCorrelations } from './latency_correlations';
import { MlCorrelations } from './ml_correlations';
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

const latencyTab = {
  key: 'latency',
  label: i18n.translate('xpack.apm.correlations.tabs.latencyLabel', {
    defaultMessage: 'Latency',
  }),
  component: LatencyCorrelations,
};
const errorRateTab = {
  key: 'errorRate',
  label: i18n.translate('xpack.apm.correlations.tabs.errorRateLabel', {
    defaultMessage: 'Error rate',
  }),
  component: ErrorCorrelations,
};
// @todo: Rename tab
const demo1Tab = {
  key: 'demo1',
  label: i18n.translate('xpack.apm.correlations.tabs.demo1Label', {
    defaultMessage: 'ML Correlations',
  }),
  component: MlCorrelations,
};
const tabs = [latencyTab, errorRateTab, demo1Tab];

export function Correlations() {
  const license = useLicenseContext();
  const hasActivePlatinumLicense = isActivePlatinumLicense(license);
  const { urlParams } = useUrlParams();
  const history = useHistory();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState(latencyTab.key);
  const { component: TabContent } =
    tabs.find((tab) => tab.key === currentTab) ?? latencyTab;
  const metric = {
    app: 'apm' as const,
    metric: hasActivePlatinumLicense
      ? 'correlations_flyout_view'
      : 'correlations_license_prompt',
    metricType: METRIC_TYPE.COUNT as METRIC_TYPE.COUNT,
  };
  useTrackMetric(metric);
  useTrackMetric({ ...metric, delay: 15000 });

  return (
    <>
      <EuiButton
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
            size="l"
            ownFocus
            onClose={() => setIsFlyoutVisible(false)}
          >
            <EuiFlyoutHeader hasBorder aria-labelledby="correlations-flyout">
              <EuiTitle>
                <h2 id="correlations-flyout">
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
              )}
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              {hasActivePlatinumLicense ? (
                <>
                  <Filters urlParams={urlParams} history={history} />
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
    <>
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
      <EuiSpacer />
    </>
  );
}

const CORRELATIONS_TITLE = i18n.translate('xpack.apm.correlations.title', {
  defaultMessage: 'Correlations',
});
