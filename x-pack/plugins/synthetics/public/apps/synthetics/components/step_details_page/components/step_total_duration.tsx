/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ReportTypes } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ClientPluginsStart } from '../../../../../plugin';

export const TotalStepDuration = () => {
  const {
    services: {
      observability: { ExploratoryViewEmbeddable },
    },
  } = useKibana<ClientPluginsStart>();
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();

  return (
    <Wrapper style={{ width: 200 }}>
      <ExploratoryViewEmbeddable
        customHeight="109px"
        reportType={ReportTypes.SINGLE_METRIC}
        attributes={[
          {
            time: { from: 'now-30d', to: 'now' },
            name: 'Step duration',
            dataType: 'synthetics',
            selectedMetricField: 'step_duration',
            operationType: 'sum',
            reportDefinitions: { 'monitor.check_group': [checkGroupId] },
            filters: [
              {
                field: 'synthetics.step.index',
                values: [Number(stepIndex)],
              },
            ],
          },
        ]}
      />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  &&& {
  }
`;
