/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiPopover, EuiText, EuiToolTip } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { getLuminance } from 'polished';
import React, { useCallback, useState } from 'react';
import { StaticIndexPatternField } from 'ui/index_patterns';
import euiStyled from '../../../../../common/eui_styled_components';
import { colorTransformer, MetricsExplorerColor } from '../../..//common/color_palette';
import { MetricsExplorerMetric } from '../../../server/routes/metrics_explorer/types';
import { MetricForm } from './metrics_form';

interface MetricProps {
  id: number;
  metric: MetricsExplorerMetric;
  onChange: (id: number, metric: MetricsExplorerMetric) => void;
  onDelete: (id: number) => void;
  fields: StaticIndexPatternField[];
  isDeleteable: boolean;
  intl: InjectedIntl;
  openFromStart?: boolean;
}

const createBadgeName = (metric: MetricsExplorerMetric) => {
  return `${metric.aggregation}(${metric.field || ''})`;
};

export const Metric = injectI18n(
  ({
    isDeleteable,
    id,
    metric,
    onChange,
    onDelete,
    fields,
    intl,
    openFromStart = false,
  }: MetricProps) => {
    const [isPopoverOpen, setPopoverState] = useState<boolean>(openFromStart);

    const intlPrefix = 'xpack.infra.metricsExplorer';
    const backgroundColor = metric.color
      ? colorTransformer(metric.color)
      : colorTransformer(MetricsExplorerColor.color0);
    const textColor = getLuminance(backgroundColor) < 0.45 ? '#FFF' : '#000';
    const buttonColor = getLuminance(backgroundColor) < 0.45 ? 'ghost' : 'text';

    const closePopover = useCallback(() => setPopoverState(false), [setPopoverState]);
    const openPopover = useCallback(() => setPopoverState(true), [setPopoverState]);

    const editMetricLabel = intl.formatMessage({
      id: `${intlPrefix}.editMetric`,
      defaultMessage: 'Edit Metric',
    });

    const button = (
      <EuiButtonIcon
        onClick={openPopover}
        aria-label={editMetricLabel}
        iconType="gear"
        color={buttonColor}
        size="s"
      />
    );

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
            <MetricForm
              fields={fields}
              isDeleteable={isDeleteable}
              onChange={onChange}
              onDelete={onDelete}
              metric={metric}
              id={id}
            />
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
