/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiFormRow, EuiIconTip, EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MetricStyle } from '@elastic/charts';
import { ToolbarPopover } from '../../../shared_components';
import { MetricVisualizationState, ValueFontMode } from '../types';
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
      {state.icon && state.icon !== 'empty' && (
        <IconAlignmentOption
          value={state.iconAlign ?? metricStateDefaults.iconAlign}
          onChange={(iconAlign) => {
            setState({ ...state, iconAlign });
          }}
        />
      )}
      <ValueFontOption
        value={state.valueFontMode ?? metricStateDefaults.valueFontMode}
        onChange={(value) => {
          setState({ ...state, valueFontMode: value });
        }}
      />
    </ToolbarPopover>
  );
};

const valueFontModes: Array<{
  id: ValueFontMode;
  label: string;
}> = [
  {
    id: 'default',
    label: i18n.translate('xpack.lens.metric.toolbarVisOptions.default', {
      defaultMessage: 'Default',
    }),
  },
  {
    id: 'fit',
    label: i18n.translate('xpack.lens.metric.toolbarVisOptions.fit', {
      defaultMessage: 'Fit',
    }),
  },
];

function ValueFontOption({
  value,
  onChange,
}: {
  value: typeof valueFontModes[number]['id'];
  onChange: (mode: ValueFontMode) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.valueFontSize', {
    defaultMessage: 'Value fontSize',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarVisOptions.valueFontSizeTip', {
              defaultMessage: 'Font size of the Primary metric value',
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
        data-test-subj="lens-value-font-mode-btn"
        buttonSize="compressed"
        idSelected={value}
        options={valueFontModes}
        onChange={(mode) => {
          onChange(mode as ValueFontMode);
        }}
      />
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
    defaultMessage: 'Titles alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            content={i18n.translate('xpack.lens.metric.toolbarVisOptions.titlesAlignmentTip', {
              defaultMessage: 'Alignment of the Title and Subtitle',
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
  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.valuesAlignment', {
    defaultMessage: 'Values alignment',
  });

  return (
    <EuiFormRow
      display="columnCompressed"
      label={
        <span>
          {label}{' '}
          <EuiIconTip
            color="subdued"
            content={i18n.translate('xpack.lens.metric.toolbarVisOptions.valuesAlignmentTip', {
              defaultMessage: 'Alignment of the Primary and Secondary Metric',
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

const iconAlignmentOptions: Array<{
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
    id: 'right',
    label: i18n.translate('xpack.lens.shared.right', {
      defaultMessage: 'Right',
    }),
  },
];

function IconAlignmentOption({
  value,
  onChange,
}: {
  value: MetricStyle['iconAlign'];
  onChange: (alignment: MetricStyle['iconAlign']) => void;
}) {
  const label = i18n.translate('xpack.lens.metric.toolbarVisOptions.iconAlignment', {
    defaultMessage: 'Icon alignment',
  });

  return (
    <EuiFormRow display="columnCompressed" label={label}>
      <EuiButtonGroup
        isFullWidth
        legend={label}
        data-test-subj="lens-icon-alignment-btn"
        buttonSize="compressed"
        options={iconAlignmentOptions}
        idSelected={value}
        onChange={(alignment) => {
          onChange(alignment as MetricStyle['iconAlign']);
        }}
      />
    </EuiFormRow>
  );
}
