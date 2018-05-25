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
import { Stat } from './stat';

function getInputStatementStats({ latestEventsPerSecond }) {
  return [
    new Stat(
      'eventsEmitted',
      'cv-inputStat__eventsEmitted',
      formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s emitted')
    )
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
    new Stat(
      'cpuStat',
      `cv-processorStat__cpuTime ${cpuHighlight}`,
      formatMetric(Math.round(percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false })
    ),
    new Stat(
      'eventMillis',
      `cv-processorStat__eventMillis ${eventMillisHighlight}`,
      formatMetric(latestMillisPerEvent, '0.[00]a', 'ms/e')
    ),
    new Stat(
      'eventsReceived',
      'cv-processorStat__events',
      formatMetric(latestEventsPerSecond, '0.[00]a', 'e/s received')
    )
  ];
}

function renderPluginStatementStats(pluginType, vertex) {
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

export function renderPluginStatement({
  hasExplicitId,
  id,
  name,
  pluginType,
  vertex,
}, onShowVertexDetails) {

  const statementStats = renderPluginStatementStats(pluginType, vertex);
  const onNameButtonClick = () => { onShowVertexDetails(vertex); };

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
