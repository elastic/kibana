/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiLoadingContent } from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';
import styled from 'styled-components';
import { colourPalette } from '../common/network_data/data_formatting';

export const ColorPalette = ({
  label,
  mimeType,
  percent,
  value,
  loading,
  labelWidth = 40,
  valueWidth = 60,
}: {
  label: string;
  mimeType: string;
  percent: number;
  value: string;
  loading: boolean;
  labelWidth?: number;
  valueWidth?: number;
}) => {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false} style={{ width: labelWidth }}>
        <EuiText size="s">{label}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <ColorPaletteFlexItem
          mimeType={mimeType}
          percent={isNaN(percent) ? 0 : percent}
          loading={loading}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: valueWidth, justifySelf: 'flex-end' }}>
        <EuiText
          size="s"
          style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}
          className="eui-textRight"
        >
          {value}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ColorPaletteFlexItem = ({
  mimeType,
  percent,
  loading,
}: {
  mimeType: string;
  percent: number;
  loading: boolean;
}) => {
  const { eui } = useTheme();

  const [value, setVal] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      if (value < percent) {
        setVal(value + 1);
      }
    }, 10);
  }, [percent, value]);

  if (loading) {
    return <LoadingLine lines={1} />;
  }

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
            height: 20,
            width: `${value}%`,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LoadingLine = styled(EuiLoadingContent)`
  &&& {
    > span {
      height: 20px;
    }
  }
`;
