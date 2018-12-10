/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { InfraMetricData } from '../../../common/graphql/types';
import { InfraMetricLayoutSection } from '../../pages/metrics/layouts/types';
import { metricTimeActions } from '../../store';
import { sections } from './sections';

interface Props {
  section: InfraMetricLayoutSection;
  metrics: InfraMetricData[];
  onChangeRangeTime?: (time: metricTimeActions.MetricRangeTimeState) => void;
  crosshairValue?: number;
  onCrosshairUpdate?: (crosshairValue: number) => void;
}

export class Section extends React.PureComponent<Props> {
  public render() {
    const metric = this.props.metrics.find(m => m.id === this.props.section.id);
    if (!metric) {
      return null;
    }
    let sectionProps = {};
    if (this.props.section.type === 'chart') {
      sectionProps = {
        onChangeRangeTime: this.props.onChangeRangeTime,
        crosshairValue: this.props.crosshairValue,
        onCrosshairUpdate: this.props.onCrosshairUpdate,
      };
    }
    const Component = sections[this.props.section.type];
    return <Component section={this.props.section} metric={metric} {...sectionProps} />;
  }
}
