/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import * as React from 'react';

import { getMillisOfScale, TimeScale } from '../../../common/time';

interface ScaleDescriptor {
  key: string;
  label: string;
  bucketSize: TimeScale;
  scale: TimeScale;
}

interface LogMinimapScaleControlsProps {
  availableMinimapScales: ScaleDescriptor[];
  minimapScale: TimeScale;
  setMinimapScale: (params: { scale: TimeScale }) => any;
  configureSummary: (
    params: { bucketSize: TimeScale; bufferSize: TimeScale }
  ) => any;
}

export class LogMinimapScaleControls extends React.PureComponent<
  LogMinimapScaleControlsProps
> {
  public handleScaleChange = (scaleKey: string) => {
    const {
      availableMinimapScales,
      configureSummary,
      setMinimapScale,
    } = this.props;
    const [scaleDescriptor] = availableMinimapScales.filter(
      scaleKeyEquals(scaleKey)
    );

    if (scaleDescriptor) {
      configureSummary({
        bucketSize: scaleDescriptor.bucketSize,
        bufferSize: scaleDescriptor.scale,
      });
      setMinimapScale({
        scale: scaleDescriptor.scale,
      });
    }
  };

  public render() {
    const { availableMinimapScales, minimapScale } = this.props;
    const [scaleDescriptor] = availableMinimapScales.filter(
      scaleValueEquals(minimapScale)
    );

    return (
      <EuiFormRow label="Minimap Scale">
        <EuiRadioGroup
          options={availableMinimapScales.map(scale => ({
            id: scale.key,
            label: scale.label,
          }))}
          onChange={this.handleScaleChange}
          idSelected={scaleDescriptor.key}
        />
      </EuiFormRow>
    );
  }
}

const scaleKeyEquals = (key: ScaleDescriptor['key']) => (
  scaleDescriptor: ScaleDescriptor
) => scaleDescriptor.key === key;

const scaleValueEquals = (value: ScaleDescriptor['scale']) => (
  scaleDescriptor: ScaleDescriptor
) => getMillisOfScale(value) === getMillisOfScale(scaleDescriptor.scale);
