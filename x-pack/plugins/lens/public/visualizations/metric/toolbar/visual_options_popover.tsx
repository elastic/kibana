/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import {
  EuiFormRow,
  EuiIconTip,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MetricStyle } from '@elastic/charts';
import { useDebouncedValue } from '@kbn/visualization-ui-components';
import { ToolbarPopover } from '../../../shared_components';
import { MetricVisualizationState } from '../types';
import { metricStateDefaults } from '../constants';

export interface VisualOptionsPopoverProps {
  state: MetricVisualizationState;
  setState: (newState: MetricVisualizationState) => void;
}

export const VisualOptionsPopover: FC<VisualOptionsPopoverProps> = ({ state, setState }) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.visualOptionsLabel', {
        defaultMessage: 'Visual options',
      })}
      type="visualOptions"
      groupPosition="left"
      buttonDataTestSubj="lnsVisualOptionsButton"
    >
      <TitlesAlignmentOption
        value={state.titlesTextAlign ?? metricStateDefaults.titlesTextAlign}
        onChange={(titlesTextAlign) => {
          setState({ ...state, titlesTextAlign });
        }}
      />
      <ValuesAlignmentOption
        value={state.valuesTextAlign ?? metricStateDefaults.valuesTextAlign}
        onChange={(valuesTextAlign) => {
          setState({ ...state, valuesTextAlign });
        }}
      />
      <ValueFontOption
        mode={state.valueFontMode ?? metricStateDefaults.valueFontMode}
        fontSize={state.valueFontSize ?? metricStateDefaults.valueFontSize}
        onChangeMode={(valueFontMode) => {
          setState({ ...state, valueFontMode });
        }}
        onChangeFontSize={(valueFontSize) => {
          setState({ ...state, valueFontSize });
        }}
      />
    </ToolbarPopover>
  );
};

type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number> | 'custom';

const valueFontModes: Array<{ value: ValueFontMode } & Pick<EuiSelectOption, 'text'>> = [
  {
    value: 'default',
    text: i18n.translate('xpack.lens.metric.toolbarVisOptions.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    value: 'fit',
    text: i18n.translate('xpack.lens.metric.toolbarVisOptions.fit', {
      defaultMessage: 'Fit',
    }),
  },
  {
    value: 'custom',
    text: i18n.translate('xpack.lens.metric.toolbarVisOptions.custom', {
      defaultMessage: 'Custom',
    }),
  },
];

function ValueFontOption({
  mode,
  fontSize,
  onChangeMode,
  onChangeFontSize,
}: {
  mode: typeof valueFontModes[number]['value'];
  fontSize: number;
  onChangeMode: (mode: ValueFontMode) => void;
  onChangeFontSize: (fontSize: number) => void;
}) {
  const dbFontValue = useDebouncedValue<number>({
    onChange: onChangeFontSize,
    value: fontSize,
  });

  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.valueFontSize', {
    defaultMessage: 'Value fontSize',
  });

  return (
    <EuiFormRow display="columnCompressed" label={label}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSelect
            fullWidth
            compressed
            data-test-subj="lens-value-font-mode-select"
            options={valueFontModes}
            value={mode}
            onChange={({ target }) => {
              onChangeMode(target.value as ValueFontMode);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            compressed
            append={i18n.translate('xpack.lens.shared.pixel', {
              defaultMessage: 'px',
            })}
            data-test-subj="lens-value-font-size"
            value={dbFontValue.inputValue}
            disabled={mode !== 'custom'}
            onChange={({ target }) => dbFontValue.handleInputChange(+target.value)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

const alignmentOptions: Array<{
  id: MetricStyle['titlesTextAlign'] | MetricStyle['valuesTextAlign'];
  label: string;
}> = [
  {
    id: 'left',
    label: i18n.translate('xpack.lens.shared.left', {
      defaultMessage: 'Left',
    }),
  },
  {
    id: 'center',
    label: i18n.translate('xpack.lens.shared.center', {
      defaultMessage: 'Center',
    }),
  },
  {
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
  },
];

function TitlesAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['titlesTextAlign'];
  onChange: (alignment: MetricStyle['titlesTextAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.titlesAlignment', {
    defaultMessage: 'Titles Alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarVisOptions.titlesAlignmentTip', {
              defaultMessage: 'Alignment of the title and subtitle',
            })}
            iconProps={{
              className: 'eui-alignTop',
            }}
            color="subdued"
            position="top"
            size="s"
            type="questionInCircle"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-titles-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['titlesTextAlign']);
        }}
      />
    </EuiFormRow>
  );
}

function ValuesAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['valuesTextAlign'];
  onChange: (alignment: MetricStyle['valuesTextAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.valueAlignment', {
    defaultMessage: 'Value Alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            color="subdued"
            content={i18n.translate('xpack.lens.metric.toolbarVisOptions.valueAlignmentTip', {
              defaultMessage: 'Alignment of the value',
            })}
            iconProps={{
              className: 'eui-alignTop',
            }}
            position="top"
            size="s"
            type="questionInCircle"
          />
        </span>
      }
    >
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-values-alignment-btn"
        buttonSize="compressed"
        options={alignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['valuesTextAlign']);
        }}
      />
    </EuiFormRow>
  );
}
