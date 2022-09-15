/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import {
  BrowserFields,
  ConfigKey,
  DataStream,
  PrivateLocation,
  Locations,
  ProjectMonitor,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { getNormalizeBrowserFields } from './browser_monitor';
import { getNormalizeICMPFields } from './icmp_monitor';
import { getNormalizeTCPFields } from './tcp_monitor';
import { getNormalizeHTTPFields } from './http_monitor';
export { getCustomHeartbeatId } from './common_fields';

export interface NormalizedProjectProps {
  locations: Locations;
  privateLocations: PrivateLocation[];
  monitor: ProjectMonitor;
  projectId: string;
  namespace: string;
}

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
}: {
  locations: Locations;
  privateLocations: PrivateLocation[];
  monitors: ProjectMonitor[];
  projectId: string;
  namespace: string;
}) => {
  return monitors.map((monitor) => {
    return normalizeProjectMonitor({ monitor, locations, privateLocations, projectId, namespace });
  });
};

export const getMonitorLocations = ({
  privateLocations,
  publicLocations,
  monitor,
}: {
  monitor: ProjectMonitor;
  privateLocations: PrivateLocation[];
  publicLocations: Locations;
}) => {
  const publicLocs =
    monitor.locations?.map((id) => {
      return publicLocations.find((location) => location.id === id);
    }) || [];
  const privateLocs =
    monitor.privateLocations?.map((locationName) => {
      return privateLocations.find(
        (location) =>
          location.label.toLowerCase() === locationName.toLowerCase() ||
          location.id.toLowerCase() === locationName.toLowerCase()
      );
    }) || [];

  return [...publicLocs, ...privateLocs].filter(
    (location) => location !== undefined
  ) as BrowserFields[ConfigKey.LOCATIONS];
};

export const normalizeYamlConfig = (monitor: NormalizedProjectProps['monitor']) => {
  const defaultFields = DEFAULT_FIELDS[monitor.type as DataStream];

  const flattenAndFormatObject = (obj: Record<string, unknown>, prefix = '', keys: string[]) =>
    Object.keys(obj).reduce<Record<string, unknown>>((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      const key = pre + k;

      /* If the key is an array of numbers, convert to an array of strings */
      if (Array.isArray(obj[k])) {
        acc[key] = (obj[k] as unknown[]).map((value) =>
          typeof value === 'number' ? String(value) : value
        );
        return acc;
      }

      /* if the key is a supported key stop flattening early */
      if (keys.includes(key)) {
        acc[key] = obj[k];
        return acc;
      }

      if (typeof obj[k] === 'object') {
        Object.assign(
          acc,
          flattenAndFormatObject(obj[k] as Record<string, unknown>, pre + k, keys)
        );
      } else {
        acc[key] = obj[k];
      }
      return acc;
    }, {});

  const supportedKeys = Object.keys(defaultFields);
  const flattenedConfig = flattenAndFormatObject(monitor, '', supportedKeys);
  const {
    locations: _locations,
    privateLocations: _privateLocations,
    content: _content,
    id: _id,
    ...yamlConfig
  } = flattenedConfig;
  const unsupportedKeys = Object.keys(yamlConfig).filter((key) => !supportedKeys.includes(key));
  const supportedYamlConfig = omit(yamlConfig, unsupportedKeys);

  return {
    yamlConfig: supportedYamlConfig,
    unsupportedKeys,
  };
};

export const getMonitorTimeout = (timeout: string) => {
  const keyMap = {
    h: 60 * 60,
    m: 60,
    s: 1,
  };
  const key = timeout.slice(-1) as 'h' | 'm' | 's';
  const time = parseInt(timeout.slice(0, -1), 10);
  const timeoutInSeconds = time * (keyMap[key] || 1);
  return typeof timeoutInSeconds === 'number' ? `${timeoutInSeconds}` : null;
};
