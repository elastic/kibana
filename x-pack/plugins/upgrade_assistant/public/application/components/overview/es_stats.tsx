/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

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
  viewDeprecationsLink: i18n.translate(
    'xpack.upgradeAssistant.esDeprecationStats.viewDeprecationsLinkText',
    {
      defaultMessage: 'View deprecations',
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
  getTotalDeprecationsTooltip: (clusterCount: number, indexCount: number) =>
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
    <EuiPanel data-test-subj="esStatsPanel" hasShadow={false} hasBorder={true}>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18nTexts.statsTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            {...reactRouterNavigate(history, '/es_deprecations/cluster')}
            data-test-subj="esDeprecationsLink"
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
            title={error ? '--' : allDeprecations.length}
            description={
              <>
                <span>{i18nTexts.totalDeprecationsTitle}</span>{' '}
                <EuiIconTip
                  content={i18nTexts.getTotalDeprecationsTooltip(
                    esDeprecations?.cluster.length ?? 0,
                    esDeprecations?.indices.length ?? 0
                  )}
                  position="right"
                  iconProps={{
                    tabIndex: -1,
                  }}
                />
              </>
            }
            isLoading={isLoading}
          >
            {error === null && (
              <EuiScreenReaderOnly>
                <p>
                  {isLoading
                    ? i18nTexts.loadingText
                    : i18nTexts.getTotalDeprecationsTooltip(
                        esDeprecations?.cluster.length ?? 0,
                        esDeprecations?.indices.length ?? 0
                      )}
                </p>
              </EuiScreenReaderOnly>
            )}
          </EuiStat>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiStat
            data-test-subj="criticalDeprecations"
            title={error ? '--' : criticalDeprecations.length}
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
      </EuiFlexGroup>
    </EuiPanel>
  );
};
