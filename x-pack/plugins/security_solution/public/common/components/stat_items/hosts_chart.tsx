/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';
import {
  indexPatternList,
  reportConfigMap,
} from '../../../app/exploratory_view/security_exploratory_view';

interface Props {}
export const HostsChart = (props: Props) => {
  const { observability } = useKibana<StartServices>().services;

  const ExploratoryViewEmbeddable = observability.ExploratoryViewEmbeddable;

  return (
    <div style={{ height: 200 }}>
      <ExploratoryViewEmbeddable
        title="Hosts"
        reportConfigMap={reportConfigMap}
        dataTypesIndexPatterns={indexPatternList}
        reportType="kpi-over-time"
        attributes={[
          {
            reportDefinitions: {
              'host.name': ['ALL_VALUES'],
            },
            name: 'hosts',
            dataType: 'security',
            selectedMetricField: 'host.name',
            time: { from: 'now-15m', to: 'now' },
          },
        ]}
        legendIsVisible={false}
        axisTitlesVisibility={{
          x: false,
          yLeft: false,
          yRight: false,
        }}
      />
    </div>
  );
};
