/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { ClientPluginsStart } from '../../../../../plugin';
export const StepDurationPanel = () => {
  const { observability } = useKibana<ClientPluginsStart>().services;

  const { ExploratoryViewEmbeddable } = observability;

  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h3>Duration by step</h3>
      </EuiTitle>
      <ExploratoryViewEmbeddable
        customHeight={'300px'}
        reportType={ReportTypes.KPI}
        attributes={[
          {
            name: 'Step duration',
            reportDefinitions: { 'monitor.id': [monitorId] },
            selectedMetricField: 'synthetics.step.duration.us',
            dataType: 'synthetics',
            time: { from: 'now-12h/h', to: 'now' },
            breakdown: 'synthetics.step.name.keyword',
            operationType: 'last_value',
          },
        ]}
      />
    </EuiPanel>
  );
};
