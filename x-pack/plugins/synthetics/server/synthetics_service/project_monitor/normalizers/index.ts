/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DataStream,
  PrivateLocation,
  Locations,
  ProjectMonitor,
} from '../../../../common/runtime_types';
import { getNormalizeBrowserFields } from './browser_monitor';
import { getNormalizeICMPFields } from './icmp_monitor';
import { getNormalizeTCPFields } from './tcp_monitor';
import { getNormalizeHTTPFields } from './http_monitor';
import { NormalizedProjectProps } from './common_fields';

export const normalizeProjectMonitor = (props: NormalizedProjectProps) => {
  const { monitor } = props;
  const type = monitor.type || DataStream.BROWSER;

  switch (type) {
    case DataStream.BROWSER:
      return getNormalizeBrowserFields(props);

    case DataStream.HTTP:
      return getNormalizeHTTPFields(props);

    case DataStream.TCP:
      return getNormalizeTCPFields(props);

    case DataStream.ICMP:
      return getNormalizeICMPFields(props);
    default:
      throw new Error(`Unsupported monitor type ${monitor.type}`);
  }
};

export const normalizeProjectMonitors = ({
  locations = [],
  privateLocations = [],
  monitors = [],
  projectId,
  namespace,
  version,
}: {
  locations: Locations;
  privateLocations: PrivateLocation[];
  monitors: ProjectMonitor[];
  projectId: string;
  namespace: string;
  version: string;
}) => {
  return monitors.map((monitor) => {
    return normalizeProjectMonitor({
      monitor,
      locations,
      privateLocations,
      projectId,
      namespace,
      version,
    });
  });
};
