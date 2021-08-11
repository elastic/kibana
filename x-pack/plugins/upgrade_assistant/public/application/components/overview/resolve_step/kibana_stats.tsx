/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import {
  EuiCard,
  EuiStat,
  EuiSpacer,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DomainDeprecationDetails } from 'kibana/public';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { useAppContext } from '../../../app_context';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.kibanaDeprecationStats.statsTitle', {
    defaultMessage: 'Kibana',
  }),
  totalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.warningDeprecationsTitle',
    {
      defaultMessage: 'Warning',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
  noWarningsText: i18n.translate('xpack.upgradeAssistant.esDeprecationStats.noWarningsText', {
    defaultMessage: 'No warnings. Good to go!',
  }),
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

export const KibanaDeprecationStats: FunctionComponent = () => {
  const history = useHistory();
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

  const warningDeprecationsCount = kibanaDeprecations?.length ?? 0;
  const criticalDeprecationsCount =
    kibanaDeprecations?.filter((deprecation) => deprecation.level === 'critical')?.length ?? 0;

  const hasWarnings = criticalDeprecationsCount > 0;
  const hasCritical = warningDeprecationsCount > 0;
  const shouldRenderNothing = !isLoading && !error && !hasWarnings && !hasCritical;
  const shouldRenderStat = (forSection: boolean) => error || isLoading || forSection;

  return (
    <EuiCard
      data-test-subj="kibanaStatsPanel"
      layout="horizontal"
      title={
        <>
          {i18nTexts.statsTitle}
          {error && (
            <EuiIconTip
              type="alert"
              color="danger"
              size="l"
              content={i18nTexts.loadingError}
              iconProps={{
                'data-test-subj': 'requestErrorIconTip',
              }}
            />
          )}
        </>
      }
      {...(!shouldRenderNothing && reactRouterNavigate(history, '/kibana_deprecations'))}
    >
      <EuiSpacer />
      <EuiFlexGroup>
        {shouldRenderNothing && (
          <EuiFlexItem>
            <EuiText color="success">
              <EuiFlexGroup gutterSize="s" alignItems="center" className="upgRenderSuccessMessage">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="check" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{i18nTexts.noWarningsText}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasCritical) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="criticalDeprecations"
              title={kibanaDeprecations ? criticalDeprecationsCount : '--'}
              titleElement="span"
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
            </EuiStat>
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasWarnings) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="totalDeprecations"
              title={error ? '--' : warningDeprecationsCount}
              titleElement="span"
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
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
};
