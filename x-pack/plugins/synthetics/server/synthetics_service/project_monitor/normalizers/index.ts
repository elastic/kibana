/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { MonitorTypeEnum, Locations, ProjectMonitor } from '../../../../common/runtime_types';
import { getNormalizeBrowserFields } from './browser_monitor';
import { getNormalizeICMPFields } from './icmp_monitor';
import { getNormalizeTCPFields } from './tcp_monitor';
import { getNormalizeHTTPFields } from './http_monitor';
import { NormalizedProjectProps } from './common_fields';

export const normalizeProjectMonitor = (props: NormalizedProjectProps) => {
  const { monitor } = props;
  const type = monitor.type || MonitorTypeEnum.BROWSER;

  switch (type) {
    case MonitorTypeEnum.BROWSER:
      return getNormalizeBrowserFields(props);

    case MonitorTypeEnum.HTTP:
      return getNormalizeHTTPFields(props);

    case MonitorTypeEnum.TCP:
      return getNormalizeTCPFields(props);

    case MonitorTypeEnum.ICMP:
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
  privateLocations: PrivateLocationAttributes[];
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
