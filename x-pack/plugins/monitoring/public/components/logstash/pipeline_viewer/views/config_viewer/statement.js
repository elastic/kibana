/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';

import { formatMetric } from '../../../../../lib/format_number';

import { PluginStatement } from './plugin_statement';
import { Stat } from './stat';

import { IfStatement } from './if_statement';
import { Queue } from './queue';

const getDefaultStats = ({ pluginType, vertex }) => {
  switch (pluginType) {
    case 'input':
      return [
        new Stat(
          formatMetric(vertex.latestEventsPerSecond, '0.[00]a', 'e/s emitted'),
          vertex.isSlow()
        )
      ];
    case 'filter':
    case 'output':
      return [
        new Stat(
          formatMetric(Math.round(vertex.percentOfTotalProcessorTime || 0), '0', '%', { prependSpace: false }),
          vertex.isTimeConsuming()
        ),
        new Stat(
          formatMetric(vertex.latestMillisPerEvent, '0.[00]a', 'ms/e'),
          vertex.isSlow()
        ),
        new Stat(formatMetric(vertex.latestEventsPerSecond, '0.[00]a', 'e/s received'))
      ];
  }
  return [];
};

export const Statement = ({ isLast, statement, vertexSelected }) => {
  const klass = statement.constructor.name;
  const { vertex } = statement;

  const handler = () => vertexSelected(vertex);
  switch (klass) {
    case 'IfStatement':
      return (
        <ul>
          <IfStatement
            isLast={isLast}
            statement={statement}
            vertexSelected={vertexSelected}
          />
        </ul>
      );
    case 'PluginStatement':
      return (
        <PluginStatement
          statement={statement}
          stats={getDefaultStats(statement)}
          vertexSelected={handler}
          isLast={isLast}
        />
      );
    case 'Queue':
      return (
        <Queue
          statement={statement}
          vertexSelected={handler}
        />
      );
  }
};
