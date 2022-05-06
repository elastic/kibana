/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';

import {
  BrowserFields,
  ConfigKey,
  DataStream,
  Locations,
  PushBrowserMonitor,
  ScheduleUnit,
} from '../../../../common/runtime_types/monitor_management';

/* Represents all of the push-monitor related fields that need to be
 * normalized. Excludes fields that we do not support for push monitors
 * This type ensures that contributors remember to add normalizers for push
 * monitors where appropriate when new keys are added to browser montiors */
type NormalizedPublicFields = Omit<
  BrowserFields,
  | ConfigKey.METADATA
  | ConfigKey.SOURCE_INLINE
  | ConfigKey.SOURCE_ZIP_URL
  | ConfigKey.SOURCE_ZIP_USERNAME
  | ConfigKey.SOURCE_ZIP_PASSWORD
  | ConfigKey.SOURCE_ZIP_FOLDER
  | ConfigKey.SOURCE_ZIP_PROXY_URL
  | ConfigKey.ZIP_URL_TLS_CERTIFICATE_AUTHORITIES
  | ConfigKey.ZIP_URL_TLS_CERTIFICATE
  | ConfigKey.ZIP_URL_TLS_KEY
  | ConfigKey.ZIP_URL_TLS_KEY_PASSPHRASE
  | ConfigKey.ZIP_URL_TLS_VERIFICATION_MODE
  | ConfigKey.ZIP_URL_TLS_VERSION
  | ConfigKey.JOURNEY_FILTERS_MATCH
  | ConfigKey.JOURNEY_FILTERS_TAGS
  | ConfigKey.PARAMS
  | ConfigKey.SYNTHETICS_ARGS
  | ConfigKey.PORT
  | ConfigKey.URLS
  | ConfigKey.ENABLED // should we allow enabled?
  | ConfigKey.NAMESPACE // should we allow namespace?
>;

export const normalizePushedMonitor = ({
  locations = [],
  monitor,
  projectId,
}: {
  locations: Locations;
  monitor: PushBrowserMonitor;
  projectId: string;
}): BrowserFields => {
  const defaultFields = DEFAULT_FIELDS[DataStream.BROWSER];
  const normalizedFields: NormalizedPublicFields = {
    [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
    [ConfigKey.IS_PUSH_MONITOR]: true,
    [ConfigKey.NAME]: monitor.name || '',
    [ConfigKey.SCHEDULE]: {
      number: `${new RegExp(/\d+/, 'g').exec(monitor.schedule)}` || '',
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKey.PROJECT_ID]: projectId || defaultFields[ConfigKey.PROJECT_ID],
    [ConfigKey.JOURNEY_ID]: monitor.id || defaultFields[ConfigKey.JOURNEY_ID],
    [ConfigKey.SOURCE_PUSH]: monitor.content || defaultFields[ConfigKey.SOURCE_PUSH],
    [ConfigKey.LOCATIONS]: monitor.locations
      ?.map((key) => {
        return locations.find(
          (location) => location.id.replace('_', ' ').toLowerCase() === key.toLowerCase()
        );
      })
      .filter((location) => location !== undefined) as BrowserFields[ConfigKey.LOCATIONS],
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
    [ConfigKey.APM_SERVICE_NAME]:
      monitor.apmServiceName || defaultFields[ConfigKey.APM_SERVICE_NAME],
    [ConfigKey.IGNORE_HTTPS_ERRORS]:
      monitor.ignoreHTTPSErrors || defaultFields[ConfigKey.IGNORE_HTTPS_ERRORS],
    [ConfigKey.SCREENSHOTS]: monitor.screenshots || defaultFields[ConfigKey.SCREENSHOTS],
    [ConfigKey.TAGS]: monitor.tags || defaultFields[ConfigKey.TAGS],
  };
  return {
    ...DEFAULT_FIELDS[DataStream.BROWSER],
    ...normalizedFields,
  };
};

export const normalizePushedMonitors = ({
  locations = [],
  monitors = [],
}: {
  locations: Locations;
  monitors: PushBrowserMonitor[];
}) => {
  return monitors.map((monitor) => {
    return normalizePushedMonitor({ monitor, locations });
  });
};
