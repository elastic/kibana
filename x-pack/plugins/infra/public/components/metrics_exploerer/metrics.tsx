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
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { getLuminance } from 'polished';
import React, { useState } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import euiStyled from '../../../../../common/eui_styled_components';
import {
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';

const createBadgeName = (metric: MetricsExplorerMetric) => {
  if (metric.aggregation === MetricsExplorerAggregation.count) {
    return 'Event Count';
  }
  return `${metric.aggregation}(${metric.field})`;
};

interface MetricProps {
  id: number;
  metric: MetricsExplorerMetric;
  onChange: (id: number, metric: MetricsExplorerMetric) => void;
  onDelete: (id: number) => void;
  fields: StaticIndexPatternField[];
  isDeleteable: boolean;
}

const Metric: React.SFC<MetricProps> = ({
  isDeleteable,
  id,
  metric,
  onChange,
  onDelete,
  fields,
}) => {
  const [isPopoverOpen, setPopoverState] = useState<boolean>(false);
  const backgroundColor = metric.color ? metric.color : '#999';
  const textColor = getLuminance(backgroundColor) < 0.45 ? '#FFF' : '#000';
  const buttonColor = getLuminance(backgroundColor) < 0.45 ? 'ghost' : 'text';
  const button = (
    <EuiButtonIcon
      onClick={() => setPopoverState(true)}
      iconType="gear"
      color={buttonColor}
      size="s"
    />
  );
  const fieldType =
    metric.aggregation === MetricsExplorerAggregation.cardinality ? 'string' : 'number';
  return (
    <MetricBadge style={{ color: textColor, backgroundColor }}>
      <EuiText size="xs">{createBadgeName(metric)}</EuiText>
      <EuiToolTip content="Edit Metric">
        <EuiPopover
          closePopover={() => setPopoverState(false)}
          id={`metric-${id}`}
          button={button}
          isOpen={isPopoverOpen}
        >
          <div style={{ width: 300 }}>
            <EuiFormRow label="Aggregation">
              <EuiSelect
                value={metric.aggregation}
                options={Object.keys(MetricsExplorerAggregation).map(k => ({ value: k, text: k }))}
                onChange={e =>
                  onChange(id, {
                    ...metric,
                    // TODO: add type guard here
                    aggregation: e.target.value as MetricsExplorerAggregation,
                  })
                }
              />
            </EuiFormRow>
            <EuiFormRow label="Field">
              <EuiComboBox
                isDisabled={metric.aggregation === MetricsExplorerAggregation.count}
                placeholder="Field"
                fullWidth
                singleSelection={{ asPlainText: true }}
                selectedOptions={[{ label: metric.field || '' }]}
                options={fields
                  .filter(f => f.aggregatable && f.type === fieldType)
                  .map(f => ({ label: f.name }))}
                onChange={selectedOptions => {
                  const field = (selectedOptions.length === 1 && selectedOptions[0].label) || null;
                  if (field) {
                    onChange(id, { ...metric, field });
                  }
                }}
                isClearable={false}
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <strong>Series Color</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiColorPicker
                    showColorLabel={false}
                    color={metric.color || '#999'}
                    onChange={color => {
                      onChange(id, { ...metric, color });
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
            {isDeleteable && (
              <React.Fragment>
                <EuiHorizontalRule />
                <EuiButton fullWidth fill color="danger" onClick={() => onDelete(id)}>
                  Delete Metric
                </EuiButton>
              </React.Fragment>
            )}
          </div>
        </EuiPopover>
      </EuiToolTip>
    </MetricBadge>
  );
};

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
  fields: StaticIndexPatternField[];
}

export const MetricsExplorerMetrics = injectI18n(({ options, onChange, fields }: Props) => {
  const handleChange = (id: number, metric: MetricsExplorerMetric) => {
    onChange(
      options.metrics.map((m, index) => {
        if (index === id) {
          return metric;
        }
        return m;
      })
    );
  };

  const handleDelete = (id: number) => {
    onChange(options.metrics.filter((m, index) => index !== id));
  };

  const handleAdd = () => {
    onChange([
      ...options.metrics,
      { aggregation: MetricsExplorerAggregation.count, color: '#3185FC' },
    ]);
  };

  return (
    <MetricsContainer>
      {options.metrics.map((metric, index) => (
        <Metric
          fields={fields}
          id={index}
          metric={metric}
          key={`metric-${index}`}
          onChange={handleChange}
          onDelete={handleDelete}
          isDeleteable={options.metrics.length > 1}
        />
      ))}
      {options.metrics.length < 3 && (
        <MetricsAddButton>
          <EuiToolTip content="Add Metric">
            <EuiButtonIcon iconType="plusInCircle" color="text" onClick={handleAdd} />
          </EuiToolTip>
        </MetricsAddButton>
      )}
    </MetricsContainer>
  );
});

const MetricsAddButton = euiStyled.div`
              text-align: right;
              flex-grow: 1;
            `;

const MetricBadge = euiStyled.div`
              padding: 2px 4px 2px 10px;
              flex: 0 1 auto;
              display: flex;
              align-items: center;
              margin-right: 4px;
            `;

const MetricsContainer = euiStyled.div`
              display: flex;
  background-color: ${params => params.theme.eui.euiFormBackgroundColor};
                          padding: 6px;
                          box-shadow:  0 1px 1px -1px rgba(152, 162, 179, 0.2),
                                       0 3px 2px -2px rgba(152, 162, 179, 0.2), 
                                       inset 0 0 0 1px rgba(0, 0, 0, 0.1)
                          `;
