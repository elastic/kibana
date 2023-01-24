/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLoadingContent,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { colourPalette } from '../common/network_data/data_formatting';

export const ColorPalette = ({
  label,
  mimeType,
  percent,
  value,
  loading,
  delta,
  hasAnyThresholdBreach,
  labelWidth = 40,
  valueWidth = 65,
}: {
  label: string;
  mimeType: string;
  percent: number;
  delta: number;
  value: string;
  loading: boolean;
  hasAnyThresholdBreach: boolean;
  labelWidth?: number;
  valueWidth?: number;
}) => {
  const getToolTipContent = () => {
    return i18n.translate('xpack.synthetics.stepDetails.palette.tooltip.label', {
      defaultMessage: 'Value is {deltaLabel} compared to steps in previous 24 hours.',
      values: {
        deltaLabel:
          Math.abs(delta) === 0
            ? i18n.translate('xpack.synthetics.stepDetails.palette.tooltip.noChange', {
                defaultMessage: 'same',
              })
            : delta > 0
            ? i18n.translate('xpack.synthetics.stepDetails.palette.increased', {
                defaultMessage: '{delta}% higher',
                values: { delta },
              })
            : i18n.translate('xpack.synthetics.stepDetails.palette.decreased', {
                defaultMessage: '{delta}% lower',
                values: { delta },
              }),
      },
    });
  };

  const getColor = () => {
    if (Math.abs(delta) < 5) {
      return 'default';
    }
    return delta > 5 ? 'danger' : 'success';
  };

  const hasDelta = Math.abs(delta) > 0;

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
          color={getColor()}
        >
          {value}
        </EuiText>
      </EuiFlexItem>
      {hasAnyThresholdBreach && (
        <EuiFlexItem grow={false} style={{ width: 40 }}>
          <EuiToolTip content={getToolTipContent()}>
            {hasDelta ? (
              <EuiIcon type={delta > 0 ? 'sortUp' : 'sortDown'} size="m" color={getColor()} />
            ) : (
              <EuiIcon type="minus" size="m" color="subdued" />
            )}
          </EuiToolTip>
        </EuiFlexItem>
      )}
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

  useEffect(() => {
    if (!loading) {
      setVal(0);
    }
  }, [loading]);

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
