/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserFields,
  ConfigKey,
  DataStream,
  FormMonitorType,
  Locations,
  ProjectBrowserMonitor,
} from '../../../../common/runtime_types/monitor_management';
import { getNormalizeCommonFields } from './common_fields';
import { getNormalizeICMPFields } from './icmp_monitor';
import { getNormalizeTCPFields } from './tcp_monitor';
import { getNormalizeHTTPFields } from './http_monitor';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';

export interface NormalizedProjectProps {
  locations: Locations;
  privateLocations: Locations;
  monitor: ProjectBrowserMonitor;
  projectId: string;
  namespace: string;
}

export const normalizeProjectMonitor = (props: NormalizedProjectProps) => {
  const { monitor } = props;

  switch (monitor.type) {
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

const getNormalizeBrowserFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): BrowserFields => {
  const defaultFields = DEFAULT_FIELDS[DataStream.BROWSER];

  const commonFields = getNormalizeCommonFields({
    locations,
    privateLocations,
    monitor,
    projectId,
    namespace,
  });

  const normalizedFields = {
    [ConfigKey.FORM_MONITOR_TYPE]: FormMonitorType.MULTISTEP,
    [ConfigKey.JOURNEY_ID]: monitor.id || defaultFields[ConfigKey.JOURNEY_ID],
    [ConfigKey.SOURCE_PROJECT_CONTENT]:
      monitor.content || defaultFields[ConfigKey.SOURCE_PROJECT_CONTENT],
    [ConfigKey.THROTTLING_CONFIG]: monitor.throttling
      ? `${monitor.throttling.download}d/${monitor.throttling.upload}u/${monitor.throttling.latency}l`
      : defaultFields[ConfigKey.THROTTLING_CONFIG],
    [ConfigKey.DOWNLOAD_SPEED]: `${
      monitor.throttling?.download || defaultFields[ConfigKey.DOWNLOAD_SPEED]
    }`,
    [ConfigKey.UPLOAD_SPEED]: `${
      monitor.throttling?.upload || defaultFields[ConfigKey.UPLOAD_SPEED]
    }`,
    [ConfigKey.IS_THROTTLING_ENABLED]:
      Boolean(monitor.throttling) || defaultFields[ConfigKey.IS_THROTTLING_ENABLED],
    [ConfigKey.LATENCY]: `${monitor.throttling?.latency || defaultFields[ConfigKey.LATENCY]}`,
    [ConfigKey.IGNORE_HTTPS_ERRORS]:
      monitor.ignoreHTTPSErrors || defaultFields[ConfigKey.IGNORE_HTTPS_ERRORS],
    [ConfigKey.SCREENSHOTS]: monitor.screenshot || defaultFields[ConfigKey.SCREENSHOTS],
    [ConfigKey.PLAYWRIGHT_OPTIONS]: Object.keys(monitor.playwrightOptions || {}).length
      ? JSON.stringify(monitor.playwrightOptions)
      : defaultFields[ConfigKey.PLAYWRIGHT_OPTIONS],
    [ConfigKey.PARAMS]: Object.keys(monitor.params || {}).length
      ? JSON.stringify(monitor.params)
      : defaultFields[ConfigKey.PARAMS],
    [ConfigKey.JOURNEY_FILTERS_MATCH]:
      monitor.filter?.match || defaultFields[ConfigKey.JOURNEY_FILTERS_MATCH],
    [ConfigKey.TIMEOUT]: null,
    ...commonFields,
  };
  return {
    ...defaultFields,
    ...normalizedFields,
  };
};

export const normalizeProjectMonitors = ({
  locations = [],
  privateLocations = [],
  monitors = [],
  projectId,
  namespace,
}: {
  locations: Locations;
  privateLocations: Locations;
  monitors: ProjectBrowserMonitor[];
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
  monitor: ProjectBrowserMonitor;
  privateLocations: Locations;
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
