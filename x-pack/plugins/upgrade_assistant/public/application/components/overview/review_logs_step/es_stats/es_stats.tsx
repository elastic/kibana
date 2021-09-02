/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { useHistory } from 'react-router-dom';

import {
  EuiStat,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { reactRouterNavigate } from '../../../../../../../../../src/plugins/kibana_react/public';
import { getDeprecationsUpperLimit } from '../../../../lib/utils';
import { useAppContext } from '../../../../app_context';
import { EsStatsErrors } from './es_stats_error';
import { NoDeprecations } from '../no_deprecations';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.esDeprecationStats.statsTitle', {
    defaultMessage: 'Elasticsearch',
  }),
  warningDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.warningDeprecationsTitle',
    {
      defaultMessage: 'Warning',
    }
  ),
  criticalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.criticalDeprecationsTitle',
    {
      defaultMessage: 'Critical',
    }
  ),
  loadingText: i18n.translate('xpack.upgradeAssistant.esDeprecationStats.loadingText', {
    defaultMessage: 'Loading Elasticsearch deprecation stats…',
  }),
  getCriticalDeprecationsMessage: (criticalDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecationStats.criticalDeprecationsLabel', {
      defaultMessage: 'This cluster has {criticalDeprecations} critical deprecations',
      values: {
        criticalDeprecations,
      },
    }),
  getWarningDeprecationMessage: (warningDeprecations: number) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecationStats.warningDeprecationsTooltip', {
      defaultMessage:
        'This cluster has {warningDeprecations} non-critical {warningDeprecations, plural, one {deprecation} other {deprecations}}',
      values: {
        warningDeprecations,
      },
    }),
};

export const ESDeprecationStats: FunctionComponent = () => {
  const history = useHistory();
  const { api } = useAppContext();

  const { data: esDeprecations, isLoading, error } = api.useLoadEsDeprecations();

  const warningDeprecations =
    esDeprecations?.deprecations?.filter((deprecation) => deprecation.isCritical === false) || [];
  const criticalDeprecations =
    esDeprecations?.deprecations?.filter((deprecation) => deprecation.isCritical) || [];

  const hasWarnings = warningDeprecations.length > 0;
  const hasCritical = criticalDeprecations.length > 0;
  const hasNoDeprecations = !isLoading && !error && !hasWarnings && !hasCritical;
  const shouldRenderStat = (forSection: boolean) => error || isLoading || forSection;

  return (
    <EuiCard
      data-test-subj="esStatsPanel"
      layout="horizontal"
      title={
        <>
          {i18nTexts.statsTitle}
          {error && <EsStatsErrors error={error} />}
        </>
      }
      {...(!hasNoDeprecations && reactRouterNavigate(history, '/es_deprecations'))}
    >
      <EuiSpacer />
      <EuiFlexGroup>
        {hasNoDeprecations && (
          <EuiFlexItem>
            <NoDeprecations />
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasCritical) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="criticalDeprecations"
              title={error ? '--' : getDeprecationsUpperLimit(criticalDeprecations.length)}
              titleElement="span"
              description={i18nTexts.criticalDeprecationsTitle}
              titleColor="danger"
              isLoading={isLoading}
            >
              {error === null && (
                <EuiScreenReaderOnly>
                  <p>
                    {isLoading
                      ? i18nTexts.loadingText
                      : i18nTexts.getCriticalDeprecationsMessage(criticalDeprecations.length)}
                  </p>
                </EuiScreenReaderOnly>
              )}
            </EuiStat>
          </EuiFlexItem>
        )}

        {shouldRenderStat(hasWarnings) && (
          <EuiFlexItem>
            <EuiStat
              data-test-subj="warningDeprecations"
              title={error ? '--' : getDeprecationsUpperLimit(warningDeprecations.length)}
              titleElement="span"
              description={i18nTexts.warningDeprecationsTitle}
              isLoading={isLoading}
            >
              {!error && (
                <EuiScreenReaderOnly>
                  <p>
                    {isLoading
                      ? i18nTexts.loadingText
                      : i18nTexts.getWarningDeprecationMessage(warningDeprecations.length)}
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
