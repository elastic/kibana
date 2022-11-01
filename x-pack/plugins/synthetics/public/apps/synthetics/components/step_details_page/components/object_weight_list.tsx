/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useObjectMetrics } from '../hooks/use_object_metrics';
import { colourPalette } from './network_waterfall/step_detail/waterfall/data_formatting';

export const ObjectWeightList = () => {
  const objectMetrics = useObjectMetrics();

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>Object weight</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            Total size:{' '}
            <span style={{ fontWeight: 'bold' }}>{objectMetrics.totalObjectsWeight}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div>
        {objectMetrics.items.map(({ label, mimeType, weightPercent, weight }) => (
          <>
            <ColorPalette
              label={label}
              mimeType={mimeType}
              percent={weightPercent}
              value={weight}
            />
            <EuiSpacer size="m" />{' '}
          </>
        ))}
      </div>
    </>
  );
};

export const ColorPalette = ({
  label,
  mimeType,
  percent,
  value,
}: {
  label: string;
  mimeType: string;
  percent: number;
  value: string;
}) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false} style={{ width: 50 }}>
        <EuiText>{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <ColorPaletteFlexItem mimeType={mimeType} percent={percent} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 80 }}>
        <EuiText>{value}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ColorPaletteFlexItem = ({
  mimeType,
  percent,
}: {
  mimeType: string;
  percent: number;
}) => {
  return (
    <EuiFlexGroup
      gutterSize="none"
      style={{
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <EuiFlexItem grow={true} style={{ backgroundColor: '#D3DAE6' }}>
        <span
          style={{
            backgroundColor: (colourPalette as Record<string, string>)[mimeType],
            height: 24,
            width: `${percent}%`,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
