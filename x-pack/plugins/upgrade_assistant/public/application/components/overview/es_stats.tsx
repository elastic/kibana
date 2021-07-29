/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import {
  EuiStat,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RouteComponentProps } from 'react-router-dom';
import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import { useAppContext } from '../../app_context';
import { EsStatsErrors } from './es_stats_error';

const i18nTexts = {
  statsTitle: i18n.translate('xpack.upgradeAssistant.esDeprecationStats.statsTitle', {
    defaultMessage: 'Elasticsearch',
  }),
  totalDeprecationsTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.totalDeprecationsTitle',
    {
      defaultMessage: 'Deprecations',
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
  getTotalDeprecationsMessage: (clusterCount: number, indexCount: number) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecationStats.totalDeprecationsTooltip', {
      defaultMessage:
        'This cluster is using {clusterCount} deprecated cluster settings and {indexCount} deprecated index settings',
      values: {
        clusterCount,
        indexCount,
      },
    }),
};

interface Props {
  history: RouteComponentProps['history'];
}

export const ESDeprecationStats: FunctionComponent<Props> = ({ history }) => {
  const { api } = useAppContext();

  const { data: esDeprecations, isLoading, error } = api.useLoadUpgradeStatus();

  const allDeprecations = esDeprecations?.cluster?.concat(esDeprecations?.indices) ?? [];
  const criticalDeprecations = allDeprecations.filter(
    (deprecation) => deprecation.level === 'critical'
  );

  return (
    <EuiCard
      data-test-subj="esStatsPanel"
      layout="horizontal"
      title={i18nTexts.statsTitle}
      {...reactRouterNavigate(history, '/es_deprecations/cluster')}
      description={
        <>
          <EuiSpacer />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                data-test-subj="criticalDeprecations"
                title={error ? '--' : criticalDeprecations.length}
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

                {error && <EsStatsErrors error={error} />}
              </EuiStat>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiStat
                data-test-subj="totalDeprecations"
                title={error ? '--' : allDeprecations.length}
                titleElement="span"
                description={i18nTexts.totalDeprecationsTitle}
                isLoading={isLoading}
              >
                {error === null && (
                  <EuiScreenReaderOnly>
                    <p>
                      {isLoading
                        ? i18nTexts.loadingText
                        : i18nTexts.getTotalDeprecationsMessage(
                            esDeprecations?.cluster.length ?? 0,
                            esDeprecations?.indices.length ?? 0
                          )}
                    </p>
                  </EuiScreenReaderOnly>
                )}
              </EuiStat>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      }
    />
  );
};
