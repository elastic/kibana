/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import uuid from 'uuid';
import {
  EuiForm,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  SnapshotCustomAggregation,
  SnapshotCustomMetricInput,
  SNAPSHOT_CUSTOM_AGGREGATIONS,
  SnapshotCustomAggregationRT,
} from '../../../../../../../common/http_api/snapshot_api';
import { EuiTheme, withTheme } from '../../../../../../../../../../src/plugins/kibana_react/common';
import { DerivedIndexPattern } from '../../../../../../containers/metrics_source';

interface SelectedOption {
  label: string;
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

interface Props {
  theme: EuiTheme | undefined;
  metric?: SnapshotCustomMetricInput;
  fields: DerivedIndexPattern['fields'];
  customMetrics: SnapshotCustomMetricInput[];
  onChange: (metric: SnapshotCustomMetricInput) => void;
  onCancel: () => void;
}

export const CustomMetricForm = withTheme(
  ({ theme, onCancel, fields, onChange, metric }: Props) => {
    const [label, setLabel] = useState<string | undefined>(metric ? metric.label : void 0);
    const [aggregation, setAggregation] = useState<SnapshotCustomAggregation>(
      metric ? metric.aggregation : 'avg'
    );
    const [field, setField] = useState<string | undefined>(metric ? metric.field : void 0);

    const handleSubmit = useCallback(() => {
      if (metric && aggregation && field) {
        onChange({
          ...metric,
          label,
          aggregation,
          field,
        });
      } else if (aggregation && field) {
        const newMetric: SnapshotCustomMetricInput = {
          type: 'custom',
          id: uuid.v1(),
          label,
          aggregation,
          field,
        };
        onChange(newMetric);
      }
    }, [metric, aggregation, field, onChange, label]);

    const handleLabelChange = useCallback(
      (e) => {
        setLabel(e.target.value);
      },
      [setLabel]
    );

    const handleFieldChange = useCallback(
      (selectedOptions: SelectedOption[]) => {
        setField(selectedOptions[0].label);
      },
      [setField]
    );

    const handleAggregationChange = useCallback(
      (e) => {
        const value = e.target.value;
        const aggValue: SnapshotCustomAggregation = SnapshotCustomAggregationRT.is(value)
          ? value
          : 'avg';
        setAggregation(aggValue);
      },
      [setAggregation]
    );

    const fieldOptions = fields
      .filter((f) => f.aggregatable && f.type === 'number' && !(field && field === f.name))
      .map((f) => ({ label: f.name }));

    const aggregationOptions = SNAPSHOT_CUSTOM_AGGREGATIONS.map((k) => ({
      text: AGGREGATION_LABELS[k as SnapshotCustomAggregation],
      value: k,
    }));

    const isSubmitDisabled = !field || !aggregation;

    const title = metric
      ? i18n.translate('xpack.infra.waffle.customMetricPanelLabel.edit', {
          defaultMessage: 'Edit custom metric',
        })
      : i18n.translate('xpack.infra.waffle.customMetricPanelLabel.add', {
          defaultMessage: 'Add custom metric',
        });

    const titleAriaLabel = metric
      ? i18n.translate('xpack.infra.waffle.customMetricPanelLabel.editAriaLabel', {
          defaultMessage: 'Back to custom metrics edit mode',
        })
      : i18n.translate('xpack.infra.waffle.customMetricPanelLabel.addAriaLabel', {
          defaultMessage: 'Back to metric picker',
        });

    return (
      <div style={{ width: 685 }}>
        <EuiForm>
          <EuiPopoverTitle>
            <EuiButtonEmpty
              iconType="arrowLeft"
              onClick={onCancel}
              color="text"
              size="xs"
              flush="left"
              style={{ fontWeight: 700, textTransform: 'uppercase' }}
              aria-label={titleAriaLabel}
            >
              {title}
            </EuiButtonEmpty>
          </EuiPopoverTitle>
          <div
            style={{
              padding: theme?.eui.paddingSizes.m,
              borderBottom: `${theme?.eui.euiBorderWidthThin} solid ${theme?.eui.euiBorderColor}`,
            }}
          >
            <EuiFormRow
              label={i18n.translate('xpack.infra.waffle.customMetrics.metricLabel', {
                defaultMessage: 'Metric',
              })}
              display="rowCompressed"
              fullWidth
            >
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiSelect
                    onChange={handleAggregationChange}
                    value={aggregation}
                    options={aggregationOptions}
                    fullWidth
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText color="subdued">
                    <span>of</span>
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
                    selectedOptions={field ? [{ label: field }] : []}
                    options={fieldOptions}
                    onChange={handleFieldChange}
                    isClearable={false}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('xpack.infra.waffle.customMetrics.labelLabel', {
                defaultMessage: 'Label (optional)',
              })}
              display="rowCompressed"
              fullWidth
            >
              <EuiFieldText
                name="label"
                placeholder={i18n.translate('xpack.infra.waffle.customMetrics.labelPlaceholder', {
                  defaultMessage: 'Choose a name to appear in the "Metric" dropdown',
                })}
                value={label}
                fullWidth
                onChange={handleLabelChange}
              />
            </EuiFormRow>
          </div>
          <div style={{ padding: theme?.eui.paddingSizes.m, textAlign: 'right' }}>
            <EuiButtonEmpty
              onClick={onCancel}
              size="s"
              style={{ paddingRight: theme?.eui.paddingSizes.xl }}
            >
              <FormattedMessage
                id="xpack.infra.waffle.customMetrics.cancelLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
            <EuiButton
              type="submit"
              size="s"
              fill
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              <FormattedMessage
                id="xpack.infra.waffle.customMetrics.submitLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </div>
        </EuiForm>
      </div>
    );
  }
);
