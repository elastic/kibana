/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';
import { colourPalette } from './network_waterfall/step_detail/waterfall/data_formatting';
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
      <EuiFlexItem grow={false} style={{ width: 40 }}>
        <EuiText size="s">{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <ColorPaletteFlexItem mimeType={mimeType} percent={isNaN(percent) ? 0 : percent} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 60, justifySelf: 'flex-end' }}>
        <EuiText size="s" style={{ fontWeight: 'bold' }} className="eui-textRight">
          {value}
        </EuiText>
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
  const { eui } = useTheme();

  return (
    <EuiFlexGroup
      gutterSize="none"
      style={{
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <EuiFlexItem grow={true} style={{ backgroundColor: eui.euiColorLightShade }}>
        <span
          style={{
            backgroundColor: (colourPalette as Record<string, string>)[mimeType],
            height: 16,
            width: `${percent}%`,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
