/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { ClientPluginsStart } from '../../../../plugin';

export const NetworkTimingsBreakdown = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  const { checkGroupId } = useParams<{ checkGroupId: string; stepIndex: string }>();

  return (
    <>
      <EuiTitle size="xs">
        <h3>Last 24 hours</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExploratoryViewEmbeddable
        reportType={ReportTypes.KPI}
        dataTypesIndexPatterns={{
          synthetics: 'heartbeat-8*,heartbeat-7*,synthetics-*',
        }}
        legendIsVisible={false}
        attributes={[
          {
            operationType: 'last_value',
            seriesType: 'area_stacked',
            dataType: 'synthetics',
            name: 'Network timings',
            selectedMetricField: 'network_timings',
            reportDefinitions: { 'monitor.name': ['ALL_VALUES'] },
            time: {
              from: 'now-24h/h',
              to: 'now',
            },
            filters: [
              {
                field: 'monitor.check_group',
                values: [checkGroupId],
              },
            ],
          },
        ]}
      />
    </>
  );
};
