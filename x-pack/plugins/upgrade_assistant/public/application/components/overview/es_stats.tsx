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

  let content: React.ReactNode;

  if (error) {
    content = <EsStatsErrors error={error} />;
  } else {
    content = (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={allDeprecations.length}
            description={i18nTexts.totalDeprecationsTitle}
            isLoading={isLoading}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiStat
            title={criticalDeprecations.length}
            description={i18nTexts.criticalDeprecationsTitle}
            titleColor="danger"
            isLoading={isLoading}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPanel>
      <EuiTitle size="s">
        <h3>
          <EuiLink {...reactRouterNavigate(history, '/es_deprecations/cluster')}>
            {i18nTexts.statsTitle}
          </EuiLink>
        </h3>
      </EuiTitle>

      <EuiSpacer />

      {content}
    </EuiPanel>
  );
};
