/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LogsLocatorParams,
  NodeLogsLocatorParams,
} from '@kbn/logs-shared-plugin/common';
import { AllDatasetsLocatorParams } from '@kbn/deeplinks-observability/locators';
import { LocatorPublic } from '@kbn/share-plugin/common';
import moment from 'moment';
import { DurationInputObject } from 'moment';

type NodeType = 'host' | 'pod' | 'container';

const NodeTypeMapping: Record<NodeType, string> = {
  host: 'host.name',
  container: 'container.id',
  pod: 'kubernetes.pod.uid',
};

export const getNodeLogsHref = (
  nodeType: NodeType,
  id: string,
  time: number | undefined,
  allDatasetsLocator: LocatorPublic<AllDatasetsLocatorParams>,
  infraNodeLocator?: LocatorPublic<NodeLogsLocatorParams>
): string => {
  if (infraNodeLocator)
    return infraNodeLocator?.getRedirectUrl({
      nodeId: id!,
      nodeType,
      time,
    });

  return allDatasetsLocator.getRedirectUrl({
    query: getNodeQuery(nodeType, id),
    ...(time
      ? {
          timeRange: {
            from: getTimeRangeStartFromTime(time),
            to: getTimeRangeEndFromTime(time),
          },
        }
      : {}),
  });
};

export const getTraceLogsHref = (
  traceId: string,
  time: number | undefined,
  allDatasetsLocator: LocatorPublic<AllDatasetsLocatorParams>,
  infraLogsLocator: LocatorPublic<LogsLocatorParams>
): string => {
  const query = `trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}")`;

  if (infraLogsLocator)
    return infraLogsLocator.getRedirectUrl({
      filter: query,
      time,
    });

  return allDatasetsLocator.getRedirectUrl({
    query: { language: 'kuery', query },
    ...(time
      ? {
          timeRange: {
            from: getTimeRangeStartFromTime(time),
            to: getTimeRangeEndFromTime(time),
          },
        }
      : {}),
  });
};

const getNodeQuery = (type: NodeType, id: string) => {
  return { language: 'kuery', query: `${NodeTypeMapping[type]}: ${id}` };
};

const defaultTimeRangeFromPositionOffset: DurationInputObject = { hours: 1 };

const getTimeRangeStartFromTime = (time: number): string =>
  moment(time).subtract(defaultTimeRangeFromPositionOffset).toISOString();

const getTimeRangeEndFromTime = (time: number): string =>
  moment(time).add(defaultTimeRangeFromPositionOffset).toISOString();
