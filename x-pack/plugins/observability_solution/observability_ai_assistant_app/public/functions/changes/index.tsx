/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '@kbn/observability-ai-assistant-plugin/public';
import { groupBy, mapValues, orderBy } from 'lodash';
import React from 'react';
import type {
  ChangesArguments,
  ChangesFunctionResponse,
  LogChangeWithTimeseries,
  MetricChangeWithTimeseries,
} from '../../../common/functions/changes';
import {
  ChangeList,
  ChangeListItem,
  ChangeListItemImpact,
} from '../../components/changes/change_list';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from '../../types';

function sortAndGroup<T extends LogChangeWithTimeseries | MetricChangeWithTimeseries>(
  groups: T[]
): Array<{ name: string; items: T[] }> {
  const grouped = mapValues(groupBy(groups, 'name'), (items, key) => {
    return {
      name: key,
      items: orderBy(items, (item) => item.changes?.p_value ?? Number.POSITIVE_INFINITY),
    };
  });

  return orderBy(grouped, (group) => group.items[0].changes?.p_value ?? Number.POSITIVE_INFINITY);
}

function getImpactFromPValue(pValue: number) {
  if (pValue < 1e-6) {
    return ChangeListItemImpact.high;
  }

  if (pValue < 0.001) {
    return ChangeListItemImpact.medium;
  }

  return ChangeListItemImpact.low;
}

function toChangeListItem(
  item: LogChangeWithTimeseries | MetricChangeWithTimeseries
): ChangeListItem {
  return {
    label: 'regex' in item ? (item.regex as string) : item.key,
    timeseries: item.over_time,
    change:
      item.changes && item.changes.p_value !== undefined && item.changes.time !== undefined
        ? {
            impact: getImpactFromPValue(item.changes.p_value),
            time: new Date(item.changes.time).getTime(),
            type: item.changes.type,
          }
        : undefined,
  };
}

function LogChanges({ logs }: { logs: LogChangeWithTimeseries[] }) {
  const logsGroupedAndSorted = sortAndGroup(logs);

  return (
    <EuiFlexGroup direction="column">
      {logsGroupedAndSorted.map((group) => (
        <EuiFlexItem>
          <ChangeList title={group.name} items={group.items.map(toChangeListItem)} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function MetricChanges({ metrics }: { metrics: MetricChangeWithTimeseries[] }) {
  const metricsGroupedAndSorted = sortAndGroup(metrics);

  return (
    <EuiFlexGroup direction="column">
      {metricsGroupedAndSorted.map((group) => (
        <EuiFlexItem>
          <ChangeList title={group.name} items={group.items.map(toChangeListItem)} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function registerChangesRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  const renderFunction: RenderFunction<ChangesArguments, ChangesFunctionResponse> = ({
    arguments: args,
    response,
  }) => {
    const {
      data: {
        changes: { metrics, logs },
      },
    } = response;

    return (
      <EuiFlexGroup direction="column" gutterSize="l">
        {logs.length ? (
          <EuiFlexItem grow={false}>
            <LogChanges logs={logs} />
          </EuiFlexItem>
        ) : null}

        {metrics.length ? (
          <EuiFlexItem grow={false}>
            <MetricChanges metrics={metrics} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };
  registerRenderFunction('changes', renderFunction);
}
