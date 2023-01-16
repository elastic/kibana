/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiIcon } from '@elastic/eui';
import React from 'react';
import type { StatItem } from './types';
import { HoverVisibilityContainer } from '../../../common/components/hover_visibility_container';
import {
  VisualizationActions,
  HISTOGRAM_ACTIONS_BUTTON_CLASS,
} from '../../../common/components/visualization_actions';
import { FlexItem, StatValue } from './utils';
import { getEmptyTagValue } from '../../../common/components/empty_value';

export interface MetricProps {
  fields: StatItem[];
  id: string;
  timerange: { from: string; to: string };
  isAreaChartDataAvailable: boolean;
  isBarChartDataAvailable: boolean;
  inspectTitle?: string;
  inspectIndex?: number;
}

const MetricComponent = ({
  fields,
  id,
  timerange,
  isAreaChartDataAvailable,
  isBarChartDataAvailable,
  inspectTitle,
  inspectIndex,
}: MetricProps) => {
  return (
    <EuiFlexGroup>
      {fields.map((field) => (
        <FlexItem key={`stat-items-field-${field.key}`}>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            {(isAreaChartDataAvailable || isBarChartDataAvailable) && field.icon && (
              <FlexItem grow={false}>
                <EuiIcon
                  type={field.icon}
                  color={field.color}
                  size="l"
                  data-test-subj="stat-icon"
                />
              </FlexItem>
            )}

            <FlexItem>
              <HoverVisibilityContainer targetClassNames={[HISTOGRAM_ACTIONS_BUTTON_CLASS]}>
                <StatValue>
                  <p data-test-subj="stat-title">
                    {field.value != null ? field.value.toLocaleString() : getEmptyTagValue()}{' '}
                    {field.description}
                  </p>
                </StatValue>
                {field.lensAttributes && timerange && (
                  <VisualizationActions
                    lensAttributes={field.lensAttributes}
                    queryId={id}
                    inspectIndex={inspectIndex}
                    timerange={timerange}
                    title={inspectTitle}
                    className="viz-actions"
                  />
                )}
              </HoverVisibilityContainer>
            </FlexItem>
          </EuiFlexGroup>
        </FlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const Metric = React.memo(MetricComponent);
