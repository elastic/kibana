/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, uniqBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import { PrivateLocationAttributes } from '../../../runtime_types/private_locations';
import { formatLocation } from '../../../../common/utils/location_formatter';
import {
  BrowserFields,
  ConfigKey,
  CommonFields,
  MonitorTypeEnum,
  Locations,
  ProjectMonitor,
  ScheduleUnit,
  SourceType,
  MonitorFields,
} from '../../../../common/runtime_types';
import { DEFAULT_FIELDS } from '../../../../common/constants/monitor_defaults';
import { DEFAULT_COMMON_FIELDS } from '../../../../common/constants/monitor_defaults';
import { formatKibanaNamespace } from '../../formatters/private_formatters';

export interface NormalizedProjectProps {
  locations: Locations;
  privateLocations: PrivateLocationAttributes[];
  monitor: ProjectMonitor;
  projectId: string;
  namespace: string;
  version: string;
}

export interface Error {
  id: string;
  reason: string;
  details: string;
}

export interface NormalizerResult<MonitorTypeFields> {
  normalizedFields: MonitorTypeFields;
  unsupportedKeys: string[];
  errors: Error[];
}

export const getNormalizeCommonFields = ({
  locations = [],
  privateLocations = [],
  monitor,
  projectId,
  namespace,
}: NormalizedProjectProps): { errors: Error[]; normalizedFields: Partial<CommonFields> } => {
  const defaultFields = DEFAULT_COMMON_FIELDS;
  const errors = [];
  if (monitor.namespace) {
    const namespaceError = isValidNamespace(monitor.namespace).error;
    if (namespaceError) {
      errors.push(getInvalidNamespaceError(monitor, namespaceError));
    }
  }

  const monLocations = getMonitorLocations({
    monitorLocations: {
      locations: monitor.locations,
      privateLocations: monitor.privateLocations,
    },
    allPrivateLocations: privateLocations,
    allPublicLocations: locations,
  });

  const normalizedFields = {
    [ConfigKey.JOURNEY_ID]: monitor.id || defaultFields[ConfigKey.JOURNEY_ID],
    [ConfigKey.MONITOR_SOURCE_TYPE]: SourceType.PROJECT,
    [ConfigKey.NAME]: monitor.name || '',
    [ConfigKey.SCHEDULE]: {
      number: `${monitor.schedule}`,
      unit: ScheduleUnit.MINUTES,
    },
    [ConfigKey.PROJECT_ID]: projectId,
    [ConfigKey.LOCATIONS]: monLocations,
    [ConfigKey.TAGS]: getOptionalListField(monitor.tags) || defaultFields[ConfigKey.TAGS],
    [ConfigKey.NAMESPACE]:
      monitor.namespace || formatKibanaNamespace(namespace) || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.ORIGINAL_SPACE]: namespace || defaultFields[ConfigKey.NAMESPACE],
    [ConfigKey.CUSTOM_HEARTBEAT_ID]: getCustomHeartbeatId(monitor, projectId, namespace),
    [ConfigKey.ENABLED]: monitor.enabled ?? defaultFields[ConfigKey.ENABLED],
    [ConfigKey.TIMEOUT]: monitor.timeout
      ? getValueInSeconds(monitor.timeout)
      : defaultFields[ConfigKey.TIMEOUT],
    [ConfigKey.CONFIG_HASH]: monitor.hash || defaultFields[ConfigKey.CONFIG_HASH],
    [ConfigKey.MAX_ATTEMPTS]: getMaxAttempts(monitor.retestOnFailure),
    [ConfigKey.PARAMS]: Object.keys(monitor.params || {}).length
      ? JSON.stringify(monitor.params)
      : defaultFields[ConfigKey.PARAMS],
    // picking out keys specifically, so users can't add arbitrary fields
    [ConfigKey.ALERT_CONFIG]: getAlertConfig(monitor),
  };
  return { normalizedFields, errors };
};

const getAlertConfig = (monitor: ProjectMonitor) => {
  const defaultFields = DEFAULT_COMMON_FIELDS;

  return monitor.alert
    ? {
        ...defaultFields[ConfigKey.ALERT_CONFIG],
        status: {
          ...defaultFields[ConfigKey.ALERT_CONFIG]?.status,
          enabled:
            monitor.alert?.status?.enabled ??
            defaultFields[ConfigKey.ALERT_CONFIG]?.status?.enabled ??
            true,
        },
        tls: {
          ...defaultFields[ConfigKey.ALERT_CONFIG]?.tls,
          enabled:
            monitor.alert?.tls?.enabled ??
            defaultFields[ConfigKey.ALERT_CONFIG]?.tls?.enabled ??
            true,
        },
      }
    : defaultFields[ConfigKey.ALERT_CONFIG];
};

const ONLY_ONE_ATTEMPT = 1;

export const getMaxAttempts = (retestOnFailure?: boolean) => {
  const defaultFields = DEFAULT_COMMON_FIELDS;
  if (retestOnFailure) {
    return defaultFields[ConfigKey.MAX_ATTEMPTS];
  } else if (retestOnFailure === false) {
    return ONLY_ONE_ATTEMPT;
  }
  return defaultFields[ConfigKey.MAX_ATTEMPTS];
};

export const getCustomHeartbeatId = (
  monitor: NormalizedProjectProps['monitor'],
  projectId: string,
  namespace: string
) => {
  return `${monitor.id}-${projectId}-${namespace}`;
};

export const getMonitorSchedule = (schedule: number | string | MonitorFields['schedule']) => {
  if (typeof schedule === 'number' || typeof schedule === 'string') {
    return {
      number: `${schedule}`,
      unit: ScheduleUnit.MINUTES,
    };
  }
  return schedule;
};

export const LocationsMap: Record<string, string> = {
  japan: 'asia-northeast1-a',
  india: 'asia-south1-a',
  singapore: 'asia-southeast1-a',
  australia_east: 'australia-southeast1-a',
  united_kingdom: 'europe-west2-a',
  germany: 'europe-west3-a',
  canada_east: 'northamerica-northeast1-a',
  brazil: 'southamerica-east1-a',
  us_east: 'us-east4-a',
  us_west: 'us-west1-a',
};

export const getMonitorLocations = ({
  allPrivateLocations,
  allPublicLocations,
  monitorLocations,
}: {
  monitorLocations: {
    locations?: string[];
    privateLocations?: string[];
  };
  allPrivateLocations: PrivateLocationAttributes[];
  allPublicLocations: Locations;
}) => {
  const invalidPublicLocations: string[] = [];
  const invalidPrivateLocations: string[] = [];
  const publicLocs =
    monitorLocations.locations?.map((locationId) => {
      const locationFound = allPublicLocations.find(
        (location) =>
          location.id === (LocationsMap[locationId] || locationId) || location.id === locationId
      );
      if (locationFound) {
        return locationFound;
      } else {
        invalidPublicLocations.push(locationId);
      }
    }) || [];
  const privateLocs =
    monitorLocations.privateLocations?.map((locationName) => {
      const locationFound = allPrivateLocations.find(
        (location) =>
          location.label.toLowerCase() === locationName.toLowerCase() ||
          location.id.toLowerCase() === locationName.toLowerCase()
      );
      if (locationFound) {
        return locationFound;
      } else {
        invalidPrivateLocations.push(locationName);
      }
    }) || [];

  if (invalidPublicLocations.length || invalidPrivateLocations.length) {
    throw new InvalidLocationError(
      getInvalidLocationError(
        invalidPublicLocations,
        invalidPrivateLocations,
        allPublicLocations,
        allPrivateLocations
      )
    );
  }

  const allLocations = [...publicLocs, ...privateLocs]
    .filter((location) => location !== undefined)
    .map((loc) => formatLocation(loc!)) as BrowserFields[ConfigKey.LOCATIONS];

  // return only unique locations
  return uniqBy(allLocations, 'id');
};

export class InvalidLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLocationError';
  }
}

const UNSUPPORTED_OPTION_TITLE = i18n.translate(
  'xpack.synthetics.projectMonitorApi.validation.unsupportedOption.title',
  {
    defaultMessage: 'Unsupported Heartbeat option',
  }
);

const INVALID_CONFIGURATION_TITLE = i18n.translate(
  'xpack.synthetics.projectMonitorApi.validation.invalidConfiguration.title',
  {
    defaultMessage: 'Invalid Heartbeat configuration',
  }
);

const INVALID_NAMESPACE_TITLE = i18n.translate(
  'xpack.synthetics.projectMonitorApi.validation.invalidNamespace.title',
  {
    defaultMessage: 'Invalid namespace',
  }
);

export const getUnsupportedKeysError = (
  monitor: ProjectMonitor,
  unsupportedKeys: string[],
  version: string
) => ({
  id: monitor.id,
  reason: UNSUPPORTED_OPTION_TITLE,
  details: `The following Heartbeat options are not supported for ${
    monitor.type
  } project monitors in ${version}: ${unsupportedKeys.join(
    '|'
  )}. You monitor was not created or updated.`,
});

export const getInvalidUrlsOrHostsError = (
  monitor: ProjectMonitor,
  key: 'hosts' | 'urls',
  version: string
) => ({
  id: monitor.id,
  reason: INVALID_CONFIGURATION_TITLE,
  details: i18n.translate(
    'xpack.synthetics.projectMonitorApi.validation.invalidUrlOrHosts.description',
    {
      defaultMessage:
        '`{monitorType}` project monitors must have exactly one value for field `{key}` in version `{version}`. Your monitor was not created or updated.',
      values: {
        monitorType: monitor.type,
        key,
        version,
      },
    }
  ),
});

const getInvalidLocationError = (
  invalidPublic: string[],
  invalidPrivate: string[],
  allPublicLocations: Locations,
  allPrivateLocations: PrivateLocationAttributes[]
) => {
  const availablePublicMsg =
    allPublicLocations.length === 0
      ? 'No Elastic managed location available to use.'
      : `Available locations are '${allPublicLocations.map((l) => l.id).join('|')}'`;
  const availablePrivateMsg =
    allPrivateLocations.length === 0
      ? 'No private location available to use.'
      : `Available private locations are '${allPrivateLocations.map((l) => l.label).join('|')}'`;

  return i18n.translate('xpack.synthetics.projectMonitorApi.validation.invalidLocations', {
    defaultMessage: 'Invalid locations specified.{invalidPublicLocation}{invalidPrivateLocation}',
    values: {
      invalidPublicLocation:
        invalidPublic.length > 0
          ? ` Elastic managed Location(s) '${invalidPublic.join(
              '|'
            )}' not found. ${availablePublicMsg}`
          : '',
      invalidPrivateLocation:
        invalidPrivate.length > 0
          ? ` Private Location(s) '${invalidPrivate.join('|')}' not found. ${availablePrivateMsg}`
          : '',
    },
  });
};

export const getInvalidNamespaceError = (monitor: ProjectMonitor, error: string) => ({
  id: monitor.id,
  reason: INVALID_NAMESPACE_TITLE,
  details: error,
});

export const getValueInSeconds = (value: string) => {
  const keyMap = {
    h: 60 * 60,
    m: 60,
    s: 1,
  };
  const key = value.slice(-1) as 'h' | 'm' | 's';
  const time = parseInt(value.slice(0, -1), 10);
  const valueInSeconds = time * (keyMap[key] || 1);
  return typeof valueInSeconds === 'number' ? `${valueInSeconds}` : null;
};

/**
 * Accounts for array values that are optionally defined as a comma seperated list
 *
 * @param {Array | string} [value]
 * @returns {array} Returns an array
 */
export const getOptionalListField = (value?: string[] | string): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? value.split(',') : [];
};

/**
 * Accounts for heartbeat fields that are optionally an array or single string
 *
 * @param {Array | string} [value]
 * @returns {string} Returns first item when the value is an array, or the value itself
 */
export const getOptionalArrayField = (value: string[] | string = ''): string | undefined => {
  const array = getOptionalListField(value);
  return array[0];
};

/**
 * Flattens arbitrary yaml into a synthetics monitor compatible configuration
 *
 * @param {Object} [monitor]
 * @returns {Object} Returns an object containing synthetics-compatible configuration keys
 */
export const flattenAndFormatObject = (obj: Record<string, unknown>, prefix = '', keys: string[]) =>
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
      Object.assign(acc, flattenAndFormatObject(obj[k] as Record<string, unknown>, pre + k, keys));
    } else {
      acc[key] = obj[k];
    }
    return acc;
  }, {});

export const normalizeYamlConfig = (monitor: NormalizedProjectProps['monitor']) => {
  const defaultFields = DEFAULT_FIELDS[monitor.type as MonitorTypeEnum];
  const supportedKeys = Object.keys(defaultFields);
  const flattenedConfig = flattenAndFormatObject(monitor, '', supportedKeys);
  const {
    locations: _locations,
    privateLocations: _privateLocations,
    content: _content,
    id: _id,
    retestOnFailure: _retestOnFailure,
    ...yamlConfig
  } = flattenedConfig;
  const unsupportedKeys = Object.keys(yamlConfig).filter((key) => !supportedKeys.includes(key));
  const supportedYamlConfig = omit(yamlConfig, unsupportedKeys);

  return {
    yamlConfig: supportedYamlConfig,
    unsupportedKeys,
  };
};

// returns true when any ssl fields are defined
export const getHasTLSFields = (monitor: ProjectMonitor) =>
  Object.keys(monitor).some((key) => key.includes('ssl'));
