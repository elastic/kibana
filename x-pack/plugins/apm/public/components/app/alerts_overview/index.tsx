/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { AlertsTableFlyoutState } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../plugin';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { SERVICE_NAME } from '../../../../common/elasticsearch_fieldnames';

export function AlertsOverview() {
  const {
    path: { serviceName },
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/alerts');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  console.log(start);
  console.log(end);

  const { services } = useKibana<ApmPluginStartDeps>();

  console.log('serviceName', serviceName);
  const {
    triggersActionsUi: {
      getAlertsStateTable,
      alertsTableConfigurationRegistry,
    },
  } = services;

  const alertStateProps = {
    alertsTableConfigurationRegistry,
    id: 'apm',
    configurationId: 'apm',
    featureIds: [AlertConsumers.APM],
    flyoutState: AlertsTableFlyoutState.external,
    query: {
      bool: {
        filter: [
          {
            term: {
              [SERVICE_NAME]: serviceName,
            },
          },
          {
            range: {
              ['@timestamp']: {
                gte: start,
                lte: end,
              },
            },
          },
          // ...rangeQuery(start, end),
        ],
      },
    },
    showExpandToDetails: false,
  };
  return (
    <EuiPanel borderRadius="none" hasShadow={false}>
      {getAlertsStateTable(alertStateProps)}
    </EuiPanel>
  );
}
