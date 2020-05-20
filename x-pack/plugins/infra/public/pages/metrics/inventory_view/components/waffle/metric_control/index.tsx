/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../../../../../common/http_api/snapshot_api';
import { CustomMetricForm } from './custom_metric_form';
import { getCustomMetricLabel } from './get_custom_metric_label';
import { MetricsContextMenu } from './metrics_context_menu';
import { ModeSwitcher } from './mode_switcher';
import { MetricsEditMode } from './metrics_edit_mode';
import { CustomMetricMode } from './types';
import { SnapshotMetricType } from '../../../../../../../common/inventory_models/types';
import { DropdownButton } from '../../dropdown_button';

interface Props {
  options: Array<{ text: string; value: string }>;
  metric: SnapshotMetricInput;
  fields: IFieldType[];
  onChange: (metric: SnapshotMetricInput) => void;
  onChangeCustomMetrics: (metrics: SnapshotCustomMetricInput[]) => void;
  customMetrics: SnapshotCustomMetricInput[];
}

export const WaffleMetricControls = ({
  fields,
  onChange,
  onChangeCustomMetrics,
  metric,
  options,
  customMetrics,
}: Props) => {
  const [isPopoverOpen, setPopoverState] = useState<boolean>(false);
  const [mode, setMode] = useState<CustomMetricMode>('pick');
  const [editModeCustomMetrics, setEditModeCustomMetrics] = useState<SnapshotCustomMetricInput[]>(
    []
  );
  const [editCustomMetric, setEditCustomMetric] = useState<SnapshotCustomMetricInput | undefined>();
  const handleClose = useCallback(() => {
    setPopoverState(false);
  }, [setPopoverState]);

  const handleToggle = useCallback(() => {
    setPopoverState(!isPopoverOpen);
  }, [isPopoverOpen]);

  const handleCustomMetric = useCallback(
    (newMetric: SnapshotCustomMetricInput) => {
      onChangeCustomMetrics([...customMetrics, newMetric]);
      onChange(newMetric);
      setMode('pick');
    },
    [customMetrics, onChange, onChangeCustomMetrics, setMode]
  );

  const setModeToEdit = useCallback(() => {
    setMode('edit');
    setEditModeCustomMetrics(customMetrics);
  }, [customMetrics]);

  const setModeToAdd = useCallback(() => {
    setMode('addMetric');
  }, [setMode]);

  const setModeToPick = useCallback(() => {
    setMode('pick');
    setEditModeCustomMetrics([]);
  }, [setMode]);

  const handleDeleteCustomMetric = useCallback(
    (m: SnapshotCustomMetricInput) => {
      // If the metric we are deleting is the currently selected metric
      // we need to change to the default.
      if (SnapshotCustomMetricInputRT.is(metric) && m.id === metric.id) {
        onChange({ type: options[0].value as SnapshotMetricType });
      }
      // Filter out the deleted metric from the editbale.
      const newMetrics = editModeCustomMetrics.filter(v => v.id !== m.id);
      setEditModeCustomMetrics(newMetrics);
    },
    [editModeCustomMetrics, metric, onChange, options]
  );

  const handleEditCustomMetric = useCallback(
    (currentMetric: SnapshotCustomMetricInput) => {
      const newMetrics = customMetrics.map(m => (m.id === currentMetric.id && currentMetric) || m);
      onChangeCustomMetrics(newMetrics);
      setModeToPick();
      setEditCustomMetric(void 0);
      setEditModeCustomMetrics([]);
    },
    [customMetrics, onChangeCustomMetrics, setModeToPick]
  );

  const handleSelectMetricToEdit = useCallback(
    (currentMetric: SnapshotCustomMetricInput) => {
      setEditCustomMetric(currentMetric);
      setMode('editMetric');
    },
    [setMode, setEditCustomMetric]
  );

  const handleSaveEdit = useCallback(() => {
    onChangeCustomMetrics(editModeCustomMetrics);
    setMode('pick');
  }, [editModeCustomMetrics, onChangeCustomMetrics]);

  if (!options.length || !metric.type) {
    throw Error(
      i18n.translate('xpack.infra.waffle.unableToSelectMetricErrorTitle', {
        defaultMessage: 'Unable to select options or value for metric.',
      })
    );
  }

  const id = SnapshotCustomMetricInputRT.is(metric) && metric.id ? metric.id : metric.type;
  const currentLabel = SnapshotCustomMetricInputRT.is(metric)
    ? getCustomMetricLabel(metric)
    : options.find(o => o.value === id)?.text;

  if (!currentLabel) {
    return null;
  }

  const button = (
    <DropdownButton
      onClick={handleToggle}
      label={i18n.translate('xpack.infra.waffle.metriclabel', { defaultMessage: 'Metric' })}
    >
      {currentLabel}
    </DropdownButton>
  );

  return (
    <>
      <EuiPopover
        isOpen={isPopoverOpen}
        id="metricsPanel"
        button={button}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        closePopover={handleClose}
      >
        {mode === 'pick' ? (
          <MetricsContextMenu
            onChange={onChange}
            onClose={handleClose}
            metric={metric}
            customMetrics={customMetrics}
            options={options}
          />
        ) : null}
        {mode === 'addMetric' ? (
          <CustomMetricForm
            fields={fields}
            customMetrics={customMetrics}
            onChange={handleCustomMetric}
            onCancel={setModeToPick}
          />
        ) : null}
        {mode === 'editMetric' ? (
          <CustomMetricForm
            metric={editCustomMetric}
            fields={fields}
            customMetrics={customMetrics}
            onChange={handleEditCustomMetric}
            onCancel={setModeToEdit}
          />
        ) : null}
        {mode === 'edit' ? (
          <MetricsEditMode
            customMetrics={editModeCustomMetrics}
            options={options}
            onEdit={handleSelectMetricToEdit}
            onDelete={handleDeleteCustomMetric}
          />
        ) : null}
        <ModeSwitcher
          onEditCancel={setModeToPick}
          onEdit={setModeToEdit}
          onAdd={setModeToAdd}
          mode={mode}
          onSave={handleSaveEdit}
          customMetrics={customMetrics}
        />
      </EuiPopover>
    </>
  );
};
