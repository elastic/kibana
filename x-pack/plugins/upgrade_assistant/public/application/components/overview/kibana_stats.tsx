/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';

import {
  EuiLink,
  EuiPanel,
  EuiStat,
  EuiTitle,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RouteComponentProps } from 'react-router-dom';
import type { DomainDeprecationDetails } from 'kibana/public';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { useAppContext } from '../../app_context';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.statsTitle', {
    defaultMessage: 'Kibana',
  }),
  totalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.totalDeprecationsTitle',
    {
      defaultMessage: 'Deprecations',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
  viewDeprecationsLink: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.viewDeprecationsLinkText',
    {
      defaultMessage: 'View deprecations',
    }
  ),
  loadingError: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.loadingErrorMessage',
    {
      defaultMessage: 'An error occurred while retrieving Kibana deprecations.',
    }
  ),
  loadingText: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.loadingText', {
    defaultMessage: 'Loading Kibana deprecation stats…',
  }),
  getCriticalDeprecationsMessage: (criticalDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsLabel', {
      defaultMessage: 'Kibana has {criticalDeprecations} critical deprecations',
      values: {
        criticalDeprecations,
      },
    }),
  getTotalDeprecationsMessage: (totalDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.totalDeprecationsLabel', {
      defaultMessage: 'Kibana has {totalDeprecations} total deprecations',
      values: {
        totalDeprecations,
      },
    }),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const KibanaDeprecationStats: FunctionComponent<Props> = ({ history }) => {
  const { deprecations } = useAppContext();

  const [kibanaDeprecations, setKibanaDeprecations] = useState<
    DomainDeprecationDetails[] | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    async function getAllDeprecations() {
      setIsLoading(true);

      try {
        const response = await deprecations.getAllDeprecations();
        setKibanaDeprecations(response);
      } catch (e) {
        setError(e);
      }

      setIsLoading(false);
    }

    getAllDeprecations();
  }, [deprecations]);

  return (
    <EuiPanel data-test-subj="kibanaStatsPanel" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18nTexts.statsTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            {...reactRouterNavigate(history, '/kibana_deprecations')}
            data-test-subj="kibanaDeprecationsLink"
          >
            {i18nTexts.viewDeprecationsLink}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            data-test-subj="totalDeprecations"
            title={error ? '--' : kibanaDeprecations?.length ?? '0'}
            description={i18nTexts.totalDeprecationsTitle}
            isLoading={isLoading}
          >
            {error === undefined && (
              <EuiScreenReaderOnly>
                <p>
                  {isLoading
                    ? i18nTexts.loadingText
                    : i18nTexts.getTotalDeprecationsMessage(kibanaDeprecations?.length ?? 0)}
                </p>
              </EuiScreenReaderOnly>
            )}
          </EuiStat>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiStat
            data-test-subj="criticalDeprecations"
            title={
              kibanaDeprecations
                ? kibanaDeprecations.filter((deprecation) => deprecation.level === 'critical')
                    ?.length ?? '0'
                : '--'
            }
            description={i18nTexts.criticalDeprecationsTitle}
            titleColor="danger"
            isLoading={isLoading}
          >
            {error === undefined && (
              <EuiScreenReaderOnly>
                <p>
                  {isLoading
                    ? i18nTexts.loadingText
                    : i18nTexts.getCriticalDeprecationsMessage(
                        kibanaDeprecations
                          ? kibanaDeprecations.filter(
                              (deprecation) => deprecation.level === 'critical'
                            )?.length ?? 0
                          : 0
                      )}
                </p>
              </EuiScreenReaderOnly>
            )}

            {error && (
              <>
                <EuiSpacer size="s" />

                <EuiIconTip
                  type="alert"
                  color="danger"
                  size="l"
                  content={i18nTexts.loadingError}
                  iconProps={{
                    'data-test-subj': 'requestErrorIconTip',
                  }}
                />
              </>
            )}
          </EuiStat>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
