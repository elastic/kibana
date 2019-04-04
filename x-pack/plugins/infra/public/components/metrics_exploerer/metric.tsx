/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiColorPicker,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelect,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { getLuminance } from 'polished';
import React, { useCallback, useState } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import euiStyled from '../../../../../common/eui_styled_components';
import {
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';

interface MetricProps {
  id: number;
  metric: MetricsExplorerMetric;
  onChange: (id: number, metric: MetricsExplorerMetric) => void;
  onDelete: (id: number) => void;
  fields: StaticIndexPatternField[];
  isDeleteable: boolean;
  intl: InjectedIntl;
}

const createBadgeName = (metric: MetricsExplorerMetric) => {
  return `${metric.aggregation}(${metric.field || ''})`;
};

const isMetricsExplorerAggregation = (subject: any): subject is MetricsExplorerAggregation => {
  return Object.keys(MetricsExplorerAggregation).includes(subject);
};

export const Metric = injectI18n(
  ({ isDeleteable, id, metric, onChange, onDelete, fields, intl }: MetricProps) => {
    const [isPopoverOpen, setPopoverState] = useState<boolean>(false);
    const intlPrefix = 'xpack.infra.metricsExplorer';
    const backgroundColor = metric.color ? metric.color : '#999';
    const textColor = getLuminance(backgroundColor) < 0.45 ? '#FFF' : '#000';
    const buttonColor = getLuminance(backgroundColor) < 0.45 ? 'ghost' : 'text';
    const closePopover = useCallback(() => setPopoverState(false), [isPopoverOpen]);
    const openPopover = useCallback(() => setPopoverState(true), [isPopoverOpen]);
    const editMetricLabel = intl.formatMessage({
      id: `${intlPrefix}.editmetric`,
      defaultMessage: 'edit metric',
    });
    const fieldLabel = intl.formatMessage({
      id: `${intlPrefix}.fieldLabel`,
      defaultMessage: 'Field',
    });
    const handleAggregationChange = useCallback(
      e =>
        onChange(id, {
          ...metric,
          aggregation:
            (isMetricsExplorerAggregation(e.target.value) && e.target.value) ||
            MetricsExplorerAggregation.count,
        }),
      [id, metric]
    );
    const handleFieldChange = useCallback(
      selectedOptions => {
        const field = (selectedOptions.length === 1 && selectedOptions[0].label) || null;
        if (field) {
          onChange(id, { ...metric, field });
        }
      },
      [id, metric]
    );
    const handleColorChange = useCallback(color => onChange(id, { ...metric, color }), [
      id,
      metric,
    ]);
    const button = (
      <EuiButtonIcon
        onClick={openPopover}
        aria-label={editMetricLabel}
        iconType="gear"
        color={buttonColor}
        size="s"
      />
    );
    const handleMetricDelete = useCallback(() => onDelete(id), [id]);
    const fieldType =
      metric.aggregation === MetricsExplorerAggregation.cardinality ? 'string' : 'number';
    return (
      <MetricBadge style={{ color: textColor, backgroundColor }}>
        <EuiText size="xs">{createBadgeName(metric)}</EuiText>
        <EuiToolTip content={editMetricLabel}>
          <EuiPopover
            closePopover={closePopover}
            id={`metric-${id}`}
            button={button}
            isOpen={isPopoverOpen}
            zIndex={20}
          >
            <div style={{ width: 300 }}>
              <EuiFormRow
                label={intl.formatMessage({
                  id: `${intlPrefix}.aggregationLabel`,
                  defaultMessage: 'Aggregation',
                })}
              >
                <EuiSelect
                  value={metric.aggregation}
                  options={Object.keys(MetricsExplorerAggregation).map(k => ({
                    value: k,
                    text: k,
                  }))}
                  onChange={handleAggregationChange}
                />
              </EuiFormRow>
              <EuiFormRow label={fieldLabel}>
                <EuiComboBox
                  isDisabled={metric.aggregation === MetricsExplorerAggregation.count}
                  placeholder={fieldLabel}
                  fullWidth
                  singleSelection={{ asPlainText: true }}
                  selectedOptions={[{ label: metric.field || '' }]}
                  options={fields
                    .filter(f => f.aggregatable && f.type === fieldType)
                    .map(f => ({ label: f.name }))}
                  onChange={handleFieldChange}
                  isClearable={false}
                />
              </EuiFormRow>
              <EuiFormRow>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>
                        <FormattedMessage
                          id={`${intlPrefix}.seriesColorLabel`}
                          defaultMessage="Series Color"
                        />
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiColorPicker
                      showColorLabel={false}
                      color={metric.color || '#999'}
                      onChange={handleColorChange}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
              {isDeleteable && (
                <React.Fragment>
                  <EuiHorizontalRule />
                  <EuiButton fullWidth fill color="danger" onClick={handleMetricDelete}>
                    <FormattedMessage
                      id={`${intlPrefix}.deleteMetricButtonLabel`}
                      defaultMessage="Delete Metric"
                    />
                  </EuiButton>
                </React.Fragment>
              )}
            </div>
          </EuiPopover>
        </EuiToolTip>
      </MetricBadge>
    );
  }
);

const MetricBadge = euiStyled.div`
  padding: 2px 4px 2px 10px;
  flex: 0 1 auto;
  display: flex;
  align-items: center;
  margin-right: 4px;
`;
