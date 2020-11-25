/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import {
  EuiExpression,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiComboBox,
  EuiButtonGroup,
  EuiSpacer,
  EuiSelect,
  EuiText,
  EuiFieldText,
} from '@elastic/eui';
import { IFieldType } from 'src/plugins/data/public';
import { EuiPopoverTitle, EuiButtonIcon } from '@elastic/eui';
import { getCustomMetricLabel } from '../../../../common/formatters/get_custom_metric_label';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
import {
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
  SnapshotCustomAggregation,
  SNAPSHOT_CUSTOM_AGGREGATIONS,
  SnapshotCustomAggregationRT,
} from '../../../../common/http_api/snapshot_api';

interface Props {
  metric?: { value: string; text: string };
  metrics: Array<{ value: string; text: string }>;
  errors: IErrorObject;
  onChange: (metric?: string) => void;
  onChangeCustom: (customMetric?: SnapshotCustomMetricInput) => void;
  customMetric?: SnapshotCustomMetricInput;
  fields: IFieldType[];
  popupPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

const AGGREGATION_LABELS = {
  ['avg']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.avg', {
    defaultMessage: 'Average',
  }),
  ['max']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.max', {
    defaultMessage: 'Max',
  }),
  ['min']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.min', {
    defaultMessage: 'Min',
  }),
  ['rate']: i18n.translate('xpack.infra.waffle.customMetrics.aggregationLables.rate', {
    defaultMessage: 'Rate',
  }),
};
const aggregationOptions = SNAPSHOT_CUSTOM_AGGREGATIONS.map((k) => ({
  text: AGGREGATION_LABELS[k as SnapshotCustomAggregation],
  value: k,
}));

export const MetricExpression = ({
  metric,
  metrics,
  customMetric,
  fields,
  errors,
  onChange,
  onChangeCustom,
  popupPosition,
}: Props) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customMetricTabOpen, setCustomMetricTabOpen] = useState(metric?.value === 'custom');
  const [selectedOption, setSelectedOption] = useState(metric?.value);
  const [fieldDisplayedCustomLabel, setFieldDisplayedCustomLabel] = useState(customMetric?.label);

  const firstFieldOption = {
    text: i18n.translate('xpack.infra.metrics.alertFlyout.expression.metric.selectFieldLabel', {
      defaultMessage: 'Select a metric',
    }),
    value: '',
  };

  const fieldOptions = useMemo(
    () =>
      fields
        .filter((f) => f.aggregatable && f.type === 'number' && !(customMetric?.field === f.name))
        .map((f) => ({ label: f.name })),
    [fields, customMetric?.field]
  );

  const expressionDisplayValue = useMemo(
    () => {
      return customMetricTabOpen
        ? customMetric?.field && getCustomMetricLabel(customMetric)
        : metric?.text || firstFieldOption.text;
    },
    // The ?s are confusing eslint here, so...
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customMetricTabOpen, metric, customMetric, firstFieldOption]
  );

  const onChangeTab = useCallback(
    (id) => {
      if (id === 'metric-popover-custom') {
        setCustomMetricTabOpen(true);
        onChange('custom');
      } else {
        setCustomMetricTabOpen(false);
        onChange(selectedOption);
      }
    },
    [setCustomMetricTabOpen, onChange, selectedOption]
  );

  const onAggregationChange = useCallback(
    (e) => {
      const value = e.target.value;
      const aggValue: SnapshotCustomAggregation = SnapshotCustomAggregationRT.is(value)
        ? value
        : 'avg';
      const newCustomMetric = {
        ...customMetric,
        aggregation: aggValue,
      };
      if (SnapshotCustomMetricInputRT.is(newCustomMetric)) onChangeCustom(newCustomMetric);
    },
    [customMetric, onChangeCustom]
  );

  const onFieldChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      const newCustomMetric = {
        ...customMetric,
        field: selectedOptions[0].label,
      };
      if (SnapshotCustomMetricInputRT.is(newCustomMetric)) onChangeCustom(newCustomMetric);
    },
    [customMetric, onChangeCustom]
  );

  const debouncedOnChangeCustom = debounce(onChangeCustom, 500);
  const onLabelChange = useCallback(
    (e) => {
      setFieldDisplayedCustomLabel(e.target.value);
      const newCustomMetric = {
        ...customMetric,
        label: e.target.value,
      };
      if (SnapshotCustomMetricInputRT.is(newCustomMetric)) debouncedOnChangeCustom(newCustomMetric);
    },
    [customMetric, debouncedOnChangeCustom]
  );

  const availablefieldsOptions = metrics.map((m) => {
    return { label: m.text, value: m.value };
  }, []);

  return (
    <EuiPopover
      id="metricPopover"
      button={
        <EuiExpression
          description={i18n.translate(
            'xpack.infra.metrics.alertFlyout.expression.metric.whenLabel',
            {
              defaultMessage: 'When',
            }
          )}
          value={expressionDisplayValue}
          isActive={Boolean(popoverOpen || (errors.metric && errors.metric.length > 0))}
          onClick={() => {
            setPopoverOpen(true);
          }}
          color={errors.metric?.length ? 'danger' : 'secondary'}
        />
      }
      isOpen={popoverOpen}
      closePopover={() => {
        setPopoverOpen(false);
      }}
      anchorPosition={popupPosition ?? 'downRight'}
      zIndex={8000}
    >
      <div style={{ width: 620 }}>
        <ClosablePopoverTitle onClose={() => setPopoverOpen(false)}>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.expression.metric.popoverTitle"
            defaultMessage="Metric"
          />
        </ClosablePopoverTitle>
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend="Metric type"
          options={[
            {
              id: 'metric-popover-default',
              label: 'Default metric',
            },
            {
              id: 'metric-popover-custom',
              label: 'Custom metric',
            },
          ]}
          idSelected={customMetricTabOpen ? 'metric-popover-custom' : 'metric-popover-default'}
          onChange={onChangeTab}
        />
        <EuiSpacer size="m" />
        {customMetricTabOpen ? (
          <>
            <EuiFormRow fullWidth>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    onChange={onAggregationChange}
                    value={customMetric?.aggregation || 'avg'}
                    options={aggregationOptions}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">
                    <span>
                      {i18n.translate('xpack.infra.waffle.customMetrics.of', {
                        defaultMessage: 'of',
                      })}
                    </span>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiComboBox
                    fullWidth
                    placeholder={i18n.translate(
                      'xpack.infra.waffle.customMetrics.fieldPlaceholder',
                      {
                        defaultMessage: 'Select a field',
                      }
                    )}
                    singleSelection={{ asPlainText: true }}
                    selectedOptions={customMetric?.field ? [{ label: customMetric.field }] : []}
                    options={fieldOptions}
                    onChange={onFieldChange}
                    isClearable={false}
                    isInvalid={errors.metric.length > 0}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.infra.waffle.alerting.customMetrics.labelLabel', {
                defaultMessage: 'Metric name (optional)',
              })}
              display="rowCompressed"
              fullWidth
              helpText={i18n.translate('xpack.infra.waffle.alerting.customMetrics.helpText', {
                defaultMessage:
                  'Choose a name to help identify your custom metric. Defaults to "<function> of <field name>".',
              })}
            >
              <EuiFieldText
                name="label"
                placeholder={i18n.translate('xpack.infra.waffle.customMetrics.labelPlaceholder', {
                  defaultMessage: 'Choose a name to appear in the "Metric" dropdown',
                })}
                value={fieldDisplayedCustomLabel}
                fullWidth
                onChange={onLabelChange}
              />
            </EuiFormRow>
          </>
        ) : (
          <EuiFormRow fullWidth>
            <EuiFlexGroup>
              <EuiFlexItem className="actOf__metricContainer">
                <EuiComboBox
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  data-test-subj="availablefieldsOptionsComboBox"
                  isInvalid={errors.metric.length > 0}
                  placeholder={firstFieldOption.text}
                  options={availablefieldsOptions}
                  noSuggestions={!availablefieldsOptions.length}
                  selectedOptions={
                    metric ? availablefieldsOptions.filter((a) => a.value === metric.value) : []
                  }
                  renderOption={(o: any) => o.label}
                  onChange={(selectedOptions) => {
                    if (selectedOptions.length > 0) {
                      onChange(selectedOptions[0].value);
                      setSelectedOption(selectedOptions[0].value);
                    } else {
                      onChange();
                    }
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        )}
      </div>
    </EuiPopover>
  );
};

interface ClosablePopoverTitleProps {
  children: JSX.Element;
  onClose: () => void;
}

export const ClosablePopoverTitle = ({ children, onClose }: ClosablePopoverTitleProps) => {
  return (
    <EuiPopoverTitle>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color="danger"
            aria-label={i18n.translate(
              'xpack.infra.metrics.expressionItems.components.closablePopoverTitle.closeLabel',
              {
                defaultMessage: 'Close',
              }
            )}
            onClick={() => onClose()}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );
};
