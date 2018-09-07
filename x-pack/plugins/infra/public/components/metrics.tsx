/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import { EuiLineSeries, EuiSeriesChart, EuiSeriesChartUtils } from '@elastic/eui/lib/experimental';
import React from 'react';
import { InfraMetricData } from '../../common/graphql/types';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../pages/metrics/layouts/types';
const { SCALE } = EuiSeriesChartUtils;

interface Props {
  metrics: InfraMetricData[];
  layout: InfraMetricLayout[];
}
export class Metrics extends React.PureComponent<Props> {
  public render() {
    return <React.Fragment>{this.props.layout.map(this.renderLayout)}</React.Fragment>;
  }

  private renderLayout = (layout: InfraMetricLayout) => {
    return (
      <React.Fragment key={layout.id}>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2>{layout.label}</h2>
          </EuiTitle>
        </EuiPageContentBody>
        {layout.sections.map(this.renderSection(layout))}
      </React.Fragment>
    );
  };

  private renderSection = (layout: InfraMetricLayout) => (section: InfraMetricLayoutSection) => {
    const metric = this.props.metrics.find(m => m.id === section.id);
    if (metric) {
      return (
        <EuiPageContentBody key={`${layout.id}-${section.id}`}>
          <EuiTitle size="s">
            <h3>{section.label}</h3>
          </EuiTitle>
          <div style={{ height: 200 }}>
            <EuiSeriesChart xType={SCALE.TIME}>
              {metric.series.map(series => {
                if (!series) {
                  return null;
                }
                const data = series.data.map(d => {
                  return { x: d.timestamp, y: d.value || 0 };
                });
                return (
                  <EuiLineSeries
                    key={`${layout.id}-${section.id}-${series.id}`}
                    lineSize={2}
                    data={data}
                    name={series.id}
                  />
                );
              })}
            </EuiSeriesChart>
          </div>
        </EuiPageContentBody>
      );
    }
  };
}
