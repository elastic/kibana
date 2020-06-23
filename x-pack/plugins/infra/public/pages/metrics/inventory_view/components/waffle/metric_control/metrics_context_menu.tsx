/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenu } from '@elastic/eui';
import {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../../../../../common/http_api/snapshot_api';
import {
  SnapshotMetricTypeRT,
  SnapshotMetricType,
} from '../../../../../../../common/inventory_models/types';
import { getCustomMetricLabel } from './get_custom_metric_label';

interface Props {
  options: Array<{ text: string; value: string }>;
  metric: SnapshotMetricInput;
  onChange: (metric: SnapshotMetricInput) => void;
  onClose: () => void;
  customMetrics: SnapshotCustomMetricInput[];
}

export const MetricsContextMenu = ({
  onClose,
  onChange,
  metric,
  options,
  customMetrics,
}: Props) => {
  const id = SnapshotCustomMetricInputRT.is(metric) && metric.id ? metric.id : metric.type;

  const handleClick = useCallback(
    (val: string) => {
      if (!SnapshotMetricTypeRT.is(val)) {
        const selectedMetric = customMetrics.find((m) => m.id === val);
        if (selectedMetric) {
          onChange(selectedMetric);
        }
      } else {
        onChange({ type: val as SnapshotMetricType });
      }
      onClose();
    },
    [customMetrics, onChange, onClose]
  );

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        ...options.map((o) => {
          const icon = o.value === id ? 'check' : 'empty';
          const panel = { name: o.text, onClick: () => handleClick(o.value), icon };
          return panel;
        }),
        ...customMetrics.map((m) => {
          const icon = m.id === id ? 'check' : 'empty';
          const panel = {
            name: getCustomMetricLabel(m),
            onClick: () => handleClick(m.id),
            icon,
          };
          return panel;
        }),
      ],
    },
  ];

  return <EuiContextMenu initialPanelId={0} panels={panels} />;
};
