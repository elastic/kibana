/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { formatMetric } from '../../../../lib/format_number';
import { Metric } from './metric';
import { i18n } from '@kbn/i18n';
import './plugin_statement.scss';

function getInputStatementMetrics({ latestEventsPerSecond }) {
  return [
    <Metric
      key="eventsEmitted"
      className="monPipelineViewer__metric--eventsEmitted"
      value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s emitted')}
    />,
  ];
}

function getProcessorStatementMetrics(processorVertex) {
  const {
    latestMillisPerEvent,
    latestEventsPerSecond,
    percentOfTotalProcessorTime,
  } = processorVertex;

  return [
    <Metric
      key="cpuMetric"
      className="monPipelineViewer__metric--cpuTime"
      warning={processorVertex.isTimeConsuming()}
      value={formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', {
        prependSpace: false,
      })}
    />,
    <Metric
      key="eventMillis"
      className="monPipelineViewer__metric--eventMillis"
      warning={processorVertex.isSlow()}
      value={formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')}
    />,
    <Metric
      key="eventsReceived"
      className="monPipelineViewer__metric--events"
      value={formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s received')}
    />,
  ];
}

function renderPluginStatementMetrics(pluginType, vertex) {
  return pluginType === 'input'
    ? getInputStatementMetrics(vertex)
    : getProcessorStatementMetrics(vertex);
}

export function PluginStatement({
  statement: { hasExplicitId, id, name, pluginType, vertex },
  onShowVertexDetails,
}) {
  const statementMetrics = renderPluginStatementMetrics(pluginType, vertex);
  const onNameButtonClick = () => {
    onShowVertexDetails(vertex);
  };

  return (
    <EuiFlexGroup
      alignItems="center"
      className="monPipelineViewer__pluginStatement"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              aria-label={name}
              className="monPipelineViewer__plugin"
              color="primary"
              flush="left"
              iconType="dot"
              onClick={onNameButtonClick}
              size="xs"
            >
              <span>{name}</span>
            </EuiButtonEmpty>
          </EuiFlexItem>
          {hasExplicitId && (
            <EuiFlexItem grow={false}>
              <EuiBadge
                onClick={onNameButtonClick}
                onClickAriaLabel={i18n.translate(
                  'xpack.monitoring.logstash.pipelineStatement.viewDetailsAriaLabel',
                  {
                    defaultMessage: 'View details',
                  }
                )}
              >
                {id}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {statementMetrics && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">{statementMetrics}</EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

PluginStatement.propTypes = {
  onShowVertexDetails: PropTypes.func.isRequired,
  statement: PropTypes.shape({
    hasExplicitId: PropTypes.bool.isRequired,
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    pluginType: PropTypes.string.isRequired,
    vertex: PropTypes.shape({
      latestEventsPerSecond: PropTypes.number.isRequired,
      latestMillisPerEvent: PropTypes.number,
      percentOfTotalProcessorTime: PropTypes.number,
    }).isRequired,
  }).isRequired,
};
