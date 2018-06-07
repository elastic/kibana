/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { formatMetric } from '../../../../../lib/format_number';
import { Metric } from './metric';

function getInputStatementMetrics({ latestEventsPerSecond }) {
  return [(
    <Metric
      key="eventsEmitted"
      className="configViewer__metric--eventsEmitted"
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

  return [
    (
      <Metric
        key="cpuMetric"
        className="configViewer__metric--cpuTime"
        warning={processorVertex.isTimeConsuming()}
        value={formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false })}
      />
    ),
    (
      <Metric
        key="eventMillis"
        className="configViewer__metric--eventMillis"
        warning={processorVertex.isSlow()}
        value={formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')}
      />
    ),
    (
      <Metric
        key="eventsReceived"
        className="configViewer__metric--events"
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
    <EuiFlexGroup
      gutterSize="none"
      justifyContent="spaceBetween"
      alignItems="center"
      className="configViewer__statement"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              color="primary"
              iconType="dot"
              flush="left"
              className="configViewer__plugin"
              onClick={onNameButtonClick}
            >
              <span>{name}</span>
            </EuiButtonEmpty>
          </EuiFlexItem>
          {
            hasExplicitId &&
            <EuiFlexItem grow={false}>
              <EuiBadge
                onClick={onNameButtonClick}
                onClickAriaLabel="View details"
              >
                {id}
              </EuiBadge>
            </EuiFlexItem>
          }
        </EuiFlexGroup>
      </EuiFlexItem>
      {
        statementMetrics &&
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="s"
          >
            {statementMetrics}
          </EuiFlexGroup>
        </EuiFlexItem>
      }
    </EuiFlexGroup>
  );
}

PluginStatement.propTypes = {
  statement: PropTypes.shape({
    hasExplicitId: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    pluginType: PropTypes.string.isRequired,
    vertex: PropTypes.object.isRequired,
  }).isRequired,
  onShowVertexDetails: PropTypes.func.isRequired,
};
