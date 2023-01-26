/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiIcon } from '@elastic/eui';
import React from 'react';
import { FlexItem, MetricItem, StatValue } from './utils';
import type { MetricStatItem } from './types';
import { LensEmbeddable } from '../../../common/components/visualization_actions/lens_embeddable';

export interface MetricEmbeddableProps {
  fields: MetricStatItem[];
  id: string;
  timerange: { from: string; to: string };
  inspectTitle?: string;
}

const MetricEmbeddableComponent = ({
  fields,
  id,
  timerange,
  inspectTitle,
}: {
  fields: MetricStatItem[];
  id: string;
  timerange: { from: string; to: string };
  inspectTitle?: string;
}) => {
  return (
    <EuiFlexGroup gutterSize="none" className="metricEmbeddable">
      {fields.map((field) => (
        <FlexItem key={`stat-items-field-${field.key}`}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            {field.icon && (
              <FlexItem grow={false}>
                <EuiIcon
                  type={field.icon}
                  color={field.color}
                  size="l"
                  data-test-subj="stat-icon"
                />
              </FlexItem>
            )}

            <MetricItem>
              {field.lensAttributes && (
                <div data-test-subj="stat-title">
                  <LensEmbeddable
                    data-test-subj="embeddable-metric"
                    height="36px"
                    id={id}
                    lensAttributes={field.lensAttributes}
                    timerange={timerange}
                    inspectTitle={inspectTitle}
                  />
                </div>
              )}
            </MetricItem>
            {field.description != null && (
              <FlexItem>
                <StatValue>
                  <p data-test-subj="stat-title">{field.description}</p>
                </StatValue>
              </FlexItem>
            )}
          </EuiFlexGroup>
        </FlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const MetricEmbeddable = React.memo(MetricEmbeddableComponent);
