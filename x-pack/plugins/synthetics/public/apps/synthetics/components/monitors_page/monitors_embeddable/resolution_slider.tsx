/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiRange, EuiDualRange, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const ResolutionSlider = ({
  min,
  max,
  height,
  onResolutionChange,
}: {
  min: number;
  max: number;
  height: number;
  onResolutionChange: ([w1, w2, h]: [number, number, number]) => void;
}) => {
  const handleWidthChange = useCallback(
    (params) => {
      const [w1, w2] = params;
      onResolutionChange([valueToWidth(w1), valueToWidth(w2) - 1, height]);
    },
    [onResolutionChange, height]
  );

  const handleHeightChange = useCallback(
    (evt) => {
      onResolutionChange([min, max, Number(evt?.currentTarget.value ?? 600)]);
    },
    [onResolutionChange, min, max]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem css={{ minWidth: 300 }}>
        <EuiDualRange
          data-test-subj="syntheticsMonitorSelectorEmbeddableViewportWidth"
          id="syntheticsMonitorSelectorEmbeddableViewportWidth"
          isDraggable={true}
          ticks={[
            { label: <EuiIcon type="mobile" size="s" />, value: 0 },
            { label: '768', value: 1 },
            { label: '1024', value: 2 },
            { label: '1200', value: 3 },
            { label: '1600', value: 4 },
            { label: '2400', value: 5 },
            { label: <EuiIcon type="desktop" size="s" />, value: 6 },
          ]}
          step={1}
          value={[widthToValue(min), widthToValue(max)]}
          min={0}
          max={6}
          showTicks
          aria-label={i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.widthSelect', {
            defaultMessage: 'Select screen width',
          })}
          onChange={handleWidthChange}
        />
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 300 }}>
        <EuiRange
          data-test-subj="syntheticsMonitorSelectorEmbeddableViewportHeight"
          id="syntheticsMonitorSelectorEmbeddableViewportHeight"
          ticks={[
            { label: '600', value: 600 },
            { label: '800', value: 800 },
            { label: '1200', value: 1200 },
          ]}
          step={1}
          value={height}
          min={600}
          max={1200}
          showTicks
          aria-label={i18n.translate('xpack.synthetics.monitorSelectorEmbeddable.heightSelect', {
            defaultMessage: 'Select screen height',
          })}
          onChange={handleHeightChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function valueToWidth(value: number) {
  switch (value) {
    case 0:
      return 0;
    case 1:
      return 769;
    case 2:
      return 1025;
    case 3:
      return 1201;
    case 4:
      return 1601;
    case 5:
      return 2401;
    case 6:
      return 3201;
    default:
      return 0;
  }
}

function widthToValue(w: number) {
  switch (w) {
    case 0:
      return 0;
    case 769:
    case 768:
      return 1;
    case 1024:
    case 1025:
      return 2;
    case 1200:
    case 1201:
      return 3;
    case 1600:
    case 1601:
      return 4;
    case 2400:
    case 2401:
      return 5;
    case 3200:
    case 3201:
      return 6;
    default:
      return 0;
  }
}
