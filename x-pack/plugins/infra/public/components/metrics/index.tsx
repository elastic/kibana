/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import React from 'react';

import { InfraMetricData } from '../../../common/graphql/types';
import { InfraMetricLayout, InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { metricTimeActions } from '../../store';
import { InfraLoadingPanel } from '../loading';
import { Section } from './section';

interface Props {
  metrics: InfraMetricData[];
  layouts: InfraMetricLayout[];
  loading: boolean;
  nodeName: string;
  onChangeRangeTime?: (time: metricTimeActions.MetricRangeTimeState) => void;
}

interface State {
  crosshairValue: number | null;
}

export class Metrics extends React.PureComponent<Props, State> {
  public readonly state = {
    crosshairValue: null,
  };

  public render() {
    if (this.props.loading) {
      return (
        <InfraLoadingPanel
          height="100vh"
          width="auto"
          text={`Loading data for ${this.props.nodeName}`}
        />
      );
    }
    return <React.Fragment>{this.props.layouts.map(this.renderLayout)}</React.Fragment>;
  }

  private renderLayout = (layout: InfraMetricLayout) => {
    return (
      <React.Fragment key={layout.id}>
        <EuiPageContentBody>
          <EuiTitle size="m">
            <h2 id={layout.id}>{`${layout.label} Overview`}</h2>
          </EuiTitle>
        </EuiPageContentBody>
        {layout.sections.map(this.renderSection(layout))}
      </React.Fragment>
    );
  };

  private renderSection = (layout: InfraMetricLayout) => (section: InfraMetricLayoutSection) => {
    let sectionProps = {};
    if (section.type === 'chart') {
      const { onChangeRangeTime } = this.props;
      sectionProps = {
        onChangeRangeTime,
        crosshairValue: this.state.crosshairValue,
        onCrosshairUpdate: this.onCrosshairUpdate,
      };
    }
    return (
      <Section
        section={section}
        metrics={this.props.metrics}
        key={`${layout.id}-${section.id}`}
        {...sectionProps}
      />
    );
  };

  private onCrosshairUpdate = (crosshairValue: number) => {
    this.setState({
      crosshairValue,
    });
  };
}
