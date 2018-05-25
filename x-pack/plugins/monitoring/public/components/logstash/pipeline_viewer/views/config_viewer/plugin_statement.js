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

function getInputStatementStats(inputVertex) {
  const { latestEventsPerSecond } = inputVertex;

  return [
    {
      name: 'eventsEmitted',
      className: 'cv-inputStat__eventsEmitted',
      value: formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s emitted')
    }
  ];
}

function getProcessorStatementStats(processorVertex) {
  const {
    latestMillisPerEvent,
    latestEventsPerSecond,
    percentOfTotalProcessorTime,
  } = processorVertex;

  const cpuHighlight = processorVertex.isTimeConsuming() ? 'cv-processorStat__cpuTimeHighlight' : '';
  const eventMillisHighlight = processorVertex.isSlow() ? 'cv-processorStat__eventMillis' : '';

  return [
    {
      name: 'cpuStat',
      className: `cv-processorStat__cpuTime ${cpuHighlight}`,
      value: formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false })
    },
    {
      name: 'eventMillis',
      className: `cv-processorStat__eventMillis ${eventMillisHighlight}`,
      value: formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')
    },
    {
      name: 'eventsReceived',
      className: 'cv-processorStat__events',
      value: formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s received')
    }
  ];
}

function getPluginStatementStatList(statement) {
  const {
    pluginType,
    vertex
  } = statement;

  const stats = pluginType === 'input'
    ? getInputStatementStats(vertex)
    : getProcessorStatementStats(vertex);

  return stats.map(({ name, className, value }) => (
    <EuiFlexItem
      grow={false}
      className={"cv-pluginStatement__statContainer"}
      key={name}
    >
      <div className={className}>
        {value}
      </div>
    </EuiFlexItem>
  ));
}

export function pluginStatement(statement, onShowVertexDetails) {
  const {
    hasExplicitId,
    id,
    name,
    vertex,
  } = statement;

  const statementStats = getPluginStatementStatList(statement);

  return (
    <div className="cv-statement">
      <EuiFlexGroup
        gutterSize="none"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
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
                onClick={() => { onShowVertexDetails(vertex); }}
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
          statementStats &&
          <EuiFlexItem grow={false}>
            <EuiFlexGroup style={{ marginRight: '0px' }}>
              {statementStats}
            </EuiFlexGroup>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
    </div>
  );
}
