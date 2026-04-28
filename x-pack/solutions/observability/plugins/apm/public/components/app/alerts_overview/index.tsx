/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import {
  APM_ALERTING_CONSUMERS,
  APM_ALERTING_RULE_TYPE_IDS,
} from '../../../../common/alerting/config/apm_alerting_feature_ids';
import type { ApmPluginStartDeps } from '../../../plugin';
import { useAlertsSearchBarContext } from './alerts_search_bar_context';

export { AlertsSearchBarContextProvider } from './alerts_search_bar_context';
export { AlertsHeaderSearchBar } from './alerts_header_search_bar';

export const ALERT_STATUS_ALL = 'all';

export function AlertsOverview() {
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    core: { http, notifications },
  } = useApmPluginContext();

  const { data, fieldFormats, application, licensing, cases, settings } = services;

  const { esQuery } = useAlertsSearchBarContext();

  return (
    <EuiPanel borderRadius="none" hasShadow={false}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          {esQuery && (
            <ObservabilityAlertsTable
              id={'service-overview-alerts'}
              ruleTypeIds={APM_ALERTING_RULE_TYPE_IDS}
              consumers={APM_ALERTING_CONSUMERS}
              query={esQuery}
              services={{
                data,
                http,
                notifications,
                fieldFormats,
                application,
                licensing,
                cases,
                settings,
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
