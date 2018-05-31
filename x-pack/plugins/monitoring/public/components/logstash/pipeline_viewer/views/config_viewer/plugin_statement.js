/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { formatMetric } from '../../../../../lib/format_number';
import { Metric } from './metric';

function getInputStatementMetrics({ latestEventsPerSecond }) {
  return [(
    <Metric
      name="eventsEmitted"
      className="cv-inputMetric__eventsEmitted"
      value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s emitted')}
    />
  )];
}

function getProcessorStatementMetrics(processorVertex) {
  const {
    latestMillisPerEvent,
    latestEventsPerSecond,
    percentOfTotalProcessorTime,
  } = processorVertex;

  const cpuHighlight = processorVertex.isTimeConsuming() ? 'cv-processorMetric__cpuTimeHighlight' : '';
  const eventMillisHighlight = processorVertex.isSlow() ? 'cv-processorMetric__eventMillis' : '';

  return [
    (
      <Metric
        name="cpuMetric"
        className={`cv-processorMetric__cpuTime ${cpuHighlight}`}
        value={formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false })}
      />
    ),
    (
      <Metric
        name="eventMillis"
        className={`cv-processorMetric__eventMillis ${eventMillisHighlight}`}
        value={formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')}
      />
    ),
    (
      <Metric
        name="eventsReceived"
        className="cv-processorMetric__events"
        value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s received')}
      />
    )
  ];
}

function renderPluginStatementMetrics(pluginType, vertex) {
  return pluginType === 'input'
    ? getInputStatementMetrics(vertex)
    : getProcessorStatementMetrics(vertex);
}

export function PluginStatement({
  statement: {
    hasExplicitId,
    id,
    name,
    pluginType,
    vertex
  },
  onShowVertexDetails
}) {
  const statementMetrics = renderPluginStatementMetrics(pluginType, vertex);
  const onNameButtonClick = () => { onShowVertexDetails(vertex); };

  return (
    <div className="cv-statement">
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem
              grow={false}
              className="cv-pluginStatement__icon"
            >
              <EuiIcon
                type="dot"
                className="cv-statement__icon"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="left"
                size="xs"
                className="cv-statement__name"
                onClick={onNameButtonClick}
              >
                <span>{name}</span>
              </EuiButtonEmpty>
            </EuiFlexItem>
            {
              hasExplicitId &&
              <EuiFlexItem grow={false}>
                <div className="cv-statement__id">
                  {id}
                </div>
              </EuiFlexItem>
            }
          </EuiFlexGroup>
        </EuiFlexItem>
        {
          statementMetrics &&
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="none"
              style={{ marginRight: '0px' }}
            >
              {statementMetrics}
            </EuiFlexGroup>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    </div>
  );
}
