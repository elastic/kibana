/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useCallback, useState } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import euiStyled from '../../../../../common/eui_styled_components';
import { MetricsExplorerColor, sampleColor } from '../../../common/color_palette';
import {
  MetricsExplorerAggregation,
  MetricsExplorerMetric,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { Metric } from './metric';

interface Props {
  intl: InjectedIntl;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
  fields: StaticIndexPatternField[];
}

export const MetricsExplorerMetrics = injectI18n(({ intl, options, onChange, fields }: Props) => {
  const [newMetric, setNewMetric] = useState<number | null>(null);
  const handleChange = useCallback(
    (id: number, metric: MetricsExplorerMetric) => {
      onChange(
        options.metrics.map((m, index) => {
          if (index === id) {
            return metric;
          }
          return m;
        })
      );
      setNewMetric(null);
    },
    [options, onChange, setNewMetric]
  );

  const handleDelete = useCallback(
    (id: number) => {
      onChange(options.metrics.filter((m, index) => index !== id));
    },
    [options, onChange]
  );

  const handleAdd = useCallback(
    () => {
      const usedColors = options.metrics.map(m => m.color || MetricsExplorerColor.color0);
      setNewMetric(options.metrics.length);
      onChange([
        ...options.metrics,
        { aggregation: MetricsExplorerAggregation.count, color: sampleColor(usedColors) },
      ]);
    },
    [options, onChange, setNewMetric]
  );

  const addMetricLabel = intl.formatMessage({
    id: 'xpack.infra.metricsExplorer.addMetricLabel',
    defaultMessage: 'Add Metric',
  });

  const openFirstMetric =
    options.metrics.length === 1 &&
    options.metrics[0] &&
    options.metrics[0].aggregation === MetricsExplorerAggregation.count &&
    options.metrics[0].color === MetricsExplorerColor.color0 &&
    options.groupBy == null;

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
          openFromStart={openFirstMetric || newMetric === index}
        />
      ))}
      {options.metrics.length < 5 && (
        <MetricsAddButton>
          <EuiToolTip content={addMetricLabel}>
            <EuiButtonIcon
              aria-label={addMetricLabel}
              iconType="plusInCircle"
              color="text"
              onClick={handleAdd}
            />
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

const MetricsContainer = euiStyled.div`
  display: flex;
  background-color: ${params => params.theme.eui.euiFormBackgroundColor};
  padding: 6px;
  box-shadow:  0 1px 1px -1px rgba(152, 162, 179, 0.2),
                0 3px 2px -2px rgba(152, 162, 179, 0.2), 
                inset 0 0 0 1px rgba(0, 0, 0, 0.1)
`;
