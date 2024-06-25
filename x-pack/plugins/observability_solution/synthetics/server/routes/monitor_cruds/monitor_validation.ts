/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { i18n } from '@kbn/i18n';
import { isLeft } from 'fp-ts/lib/Either';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';

import { omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import { AlertConfigSchema } from '../../../common/runtime_types/monitor_management/alert_config';
import { CreateMonitorPayLoad } from './add_monitor/add_monitor_api';
import { flattenAndFormatObject } from '../../synthetics_service/project_monitor/normalizers/common_fields';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import {
  BrowserFieldsCodec,
  CodeEditorMode,
  ConfigKey,
  FormMonitorType,
  HTTPFieldsCodec,
  ICMPFieldsCodec,
  Locations,
  MonitorFields,
  MonitorTypeCodec,
  MonitorTypeEnum,
  ProjectMonitor,
  ProjectMonitorCodec,
  SyntheticsMonitor,
  TCPFieldsCodec,
} from '../../../common/runtime_types';

import {
  ALLOWED_SCHEDULES_IN_MINUTES,
  DEFAULT_FIELDS,
} from '../../../common/constants/monitor_defaults';

type MonitorCodecType =
  | typeof ICMPFieldsCodec
  | typeof TCPFieldsCodec
  | typeof HTTPFieldsCodec
  | typeof BrowserFieldsCodec;

const monitorTypeToCodecMap: Record<MonitorTypeEnum, MonitorCodecType> = {
  [MonitorTypeEnum.ICMP]: ICMPFieldsCodec,
  [MonitorTypeEnum.TCP]: TCPFieldsCodec,
  [MonitorTypeEnum.HTTP]: HTTPFieldsCodec,
  [MonitorTypeEnum.BROWSER]: BrowserFieldsCodec,
};

export interface ValidationResult {
  valid: boolean;
  reason: string;
  details: string;
  payload: object;
  decodedMonitor?: SyntheticsMonitor;
}

export class MonitorValidationError extends Error {
  result: ValidationResult;
  constructor(result: ValidationResult) {
    super(result.reason);
    this.result = result;
  }
}

/**
 * Validates monitor fields with respect to the relevant Codec identified by object's 'type' property.
 * @param monitorFields {MonitorFields} The mixed type representing the possible monitor payload from UI.
 */
export function validateMonitor(monitorFields: MonitorFields): ValidationResult {
  const { [ConfigKey.MONITOR_TYPE]: monitorType } = monitorFields;

  if (monitorType !== MonitorTypeEnum.BROWSER && !monitorFields.name) {
    monitorFields.name = monitorFields.urls || monitorFields.hosts;
  }

  if (monitorFields.locations.length === 0) {
    return {
      valid: false,
      reason: LOCATION_REQUIRED_ERROR,
      details: '',
      payload: monitorFields,
    };
  }

  const decodedType = MonitorTypeCodec.decode(monitorType);

  if (isLeft(decodedType)) {
    return {
      valid: false,
      reason: INVALID_TYPE_ERROR,
      details: formatErrors(decodedType.left).join(' | '),
      payload: monitorFields,
    };
  }

  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const SyntheticsMonitorCodec = monitorTypeToCodecMap[monitorType] as typeof ICMPFieldsCodec;

  if (!SyntheticsMonitorCodec) {
    return {
      valid: false,
      reason: INVALID_PAYLOAD_ERROR,
      details: '',
      payload: monitorFields,
    };
  }

  const alert = monitorFields.alert;
  if (alert) {
    try {
      AlertConfigSchema.validate(alert);
    } catch (e) {
      return {
        valid: false,
        reason: 'Invalid alert configuration',
        details: e.message,
        payload: monitorFields,
      };
    }
  }

  if (!ALLOWED_SCHEDULES_IN_MINUTES.includes(monitorFields[ConfigKey.SCHEDULE].number)) {
    return {
      valid: false,
      reason: INVALID_SCHEDULE_ERROR,
      details: INVALID_SCHEDULE_DETAILS(monitorFields[ConfigKey.SCHEDULE].number),
      payload: monitorFields,
    };
  }

  const ExactSyntheticsMonitorCodec = t.exact(SyntheticsMonitorCodec);
  const decodedMonitor = ExactSyntheticsMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: INVALID_SCHEMA_ERROR(monitorType),
      details: formatErrors(decodedMonitor.left).join(' | '),
      payload: monitorFields,
    };
  }

  if (monitorType === MonitorTypeEnum.BROWSER) {
    const inlineScript = monitorFields[ConfigKey.SOURCE_INLINE];
    const projectContent = monitorFields[ConfigKey.SOURCE_PROJECT_CONTENT];
    if (!inlineScript && !projectContent) {
      return {
        valid: false,
        reason: 'Monitor is not a valid monitor of type browser',
        details: i18n.translate('xpack.synthetics.createMonitor.validation.noScript', {
          defaultMessage: 'source.inline.script: Script is required for browser monitor.',
        }),
        payload: monitorFields,
      };
    }
  }

  return {
    valid: true,
    reason: '',
    details: '',
    payload: monitorFields,
    decodedMonitor: decodedMonitor.right,
  };
}

export const normalizeAPIConfig = (monitor: CreateMonitorPayLoad) => {
  const monitorType = monitor.type as MonitorTypeEnum;
  const decodedType = MonitorTypeCodec.decode(monitorType);

  if (isLeft(decodedType)) {
    return {
      errorMessage: formatErrors(decodedType.left).join(' | '),
    };
  }

  const defaultFields = DEFAULT_FIELDS[monitor.type as MonitorTypeEnum];
  let supportedKeys = Object.keys(defaultFields);
  const flattenedConfig = flattenAndFormatObject(monitor, '', supportedKeys);
  const {
    locations: _locations,
    private_locations: _privateLocations,
    id: _id,
    retest_on_failure: _retestOnFailure,
    url: rawUrl,
    ssl: _rawSSL,
    host: rawHost,
    inline_script: inlineScript,
    custom_heartbeat_id: _customHeartbeatId,
    params: rawParams,
    playwright_options: rawPlaywrightOptions,
    ...rawConfig
  } = flattenedConfig;
  if (
    Object.keys(flattenedConfig).some((key) => key.startsWith('ssl.')) &&
    monitor.origin !== 'project'
  ) {
    rawConfig[ConfigKey.METADATA] = {
      is_tls_enabled: true,
      ...((flattenedConfig[ConfigKey.METADATA] as any) ?? {}),
    };
  }

  if (rawUrl) {
    // since api accept url key as well
    rawConfig[ConfigKey.URLS] = rawUrl;
  }
  if (inlineScript) {
    rawConfig[ConfigKey.SOURCE_INLINE] = inlineScript;
  }
  if (rawHost) {
    // since api accept url key as well
    rawConfig[ConfigKey.HOSTS] = rawHost;
  }
  if (
    monitor.type === 'browser' &&
    monitor[ConfigKey.FORM_MONITOR_TYPE] !== FormMonitorType.SINGLE &&
    monitor[ConfigKey.FORM_MONITOR_TYPE] !== FormMonitorType.MULTISTEP
  ) {
    // urls isn't supported for browser but is needed for SO AAD
    supportedKeys = supportedKeys.filter((key) => key !== ConfigKey.URLS);
  }
  // needed for SO AAD
  supportedKeys.push(ConfigKey.PROJECT_ID, ConfigKey.ORIGINAL_SPACE);

  let unsupportedKeys = Object.keys(rawConfig).filter((key) => !supportedKeys.includes(key));

  const result = omit(rawConfig, unsupportedKeys);

  const formattedConfig = {
    ...result,
    locations: _locations,
    private_locations: _privateLocations,
    retest_on_failure: _retestOnFailure,
    custom_heartbeat_id: _customHeartbeatId,
  } as CreateMonitorPayLoad;

  const requestBodyCheck = formattedConfig[ConfigKey.REQUEST_BODY_CHECK];
  if (typeof requestBodyCheck === 'string') {
    formattedConfig[ConfigKey.REQUEST_BODY_CHECK] = {
      type: CodeEditorMode.PLAINTEXT,
      value: requestBodyCheck,
    };
  }

  if (rawParams) {
    const { value, error } = validateParams(rawParams);
    if (error) {
      formattedConfig[ConfigKey.PARAMS] = rawParams as string;
      return {
        formattedConfig,
        errorMessage: i18n.translate('xpack.synthetics.restApi.monitor.invalidParams', {
          defaultMessage: 'Invalid params: {error}',
          values: { error: error.message },
        }),
      };
    }
    formattedConfig[ConfigKey.PARAMS] = value;
  }

  if (rawPlaywrightOptions) {
    const { value, error } = validateJSON(rawPlaywrightOptions);
    if (error) {
      formattedConfig[ConfigKey.PLAYWRIGHT_OPTIONS] = rawPlaywrightOptions as string;
      return {
        formattedConfig,
        errorMessage: i18n.translate('xpack.synthetics.restApi.monitor.invalidPlaywrightOptions', {
          defaultMessage: 'Invalid playwright_options: {error}',
          values: { error: error.message },
        }),
      };
    }
    formattedConfig[ConfigKey.PLAYWRIGHT_OPTIONS] = value;
  }

  if (unsupportedKeys.length > 0) {
    unsupportedKeys = unsupportedKeys.map((key) => {
      if (key === ConfigKey.SOURCE_INLINE && inlineScript) {
        return 'inline_script';
      }
      if (key === ConfigKey.URLS && rawUrl) {
        return 'url';
      }
      if (key === ConfigKey.HOSTS && rawHost) {
        return 'host';
      }
      return key;
    });
    return {
      formattedConfig,
      errorMessage: i18n.translate('xpack.synthetics.restApi.monitor.invalidMonitorKey', {
        defaultMessage: 'Invalid monitor key(s) for {monitorType} type:  {unsupportedKeys}',
        values: { monitorType: monitor.type, unsupportedKeys: unsupportedKeys.join(' | ') },
      }),
    };
  }
  return { formattedConfig };
};
const RecordSchema = schema.recordOf(schema.string(), schema.string());

const validateParams = (jsonString: string | any) => {
  if (typeof jsonString === 'string') {
    try {
      JSON.parse(jsonString);
      return { value: jsonString };
    } catch (e) {
      return { error: e };
    }
  }
  try {
    RecordSchema.validate(jsonString);
    return { value: JSON.stringify(jsonString) };
  } catch (e) {
    return { error: e };
  }
};

const validateJSON = (jsonString: string | any) => {
  if (typeof jsonString === 'string') {
    try {
      JSON.parse(jsonString);
      return { value: jsonString };
    } catch (e) {
      return { error: e };
    }
  }
  try {
    return { value: JSON.stringify(jsonString) };
  } catch (e) {
    return { error: e };
  }
};

export function validateProjectMonitor(
  monitorFields: ProjectMonitor,
  publicLocations: Locations,
  privateLocations: PrivateLocationAttributes[]
): ValidationResult {
  const locationsError = validateLocation(monitorFields, publicLocations, privateLocations);
  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const decodedMonitor = ProjectMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: INVALID_CONFIGURATION_ERROR,
      details: [...formatErrors(decodedMonitor.left), locationsError]
        .filter((error) => error !== '' && error !== undefined)
        .join(' | '),
      payload: monitorFields,
    };
  }

  if (locationsError) {
    return {
      valid: false,
      reason: INVALID_CONFIGURATION_ERROR,
      details: locationsError,
      payload: monitorFields,
    };
  }

  return { valid: true, reason: '', details: '', payload: monitorFields };
}

export function validateLocation(
  monitorFields: ProjectMonitor,
  publicLocations: Locations,
  privateLocations: PrivateLocationAttributes[]
) {
  const hasPublicLocationsConfigured = (monitorFields.locations || []).length > 0;
  const hasPrivateLocationsConfigured = (monitorFields.privateLocations || []).length > 0;

  if (hasPublicLocationsConfigured) {
    let invalidLocation = '';
    const hasValidPublicLocation = monitorFields.locations?.some((location) => {
      if (publicLocations.length === 0) {
        invalidLocation = location;
        return false;
      }

      return publicLocations.some((supportedLocation) => {
        const locationIsValid = supportedLocation.id === location;
        if (!locationIsValid) {
          invalidLocation = location;
        }
        return locationIsValid;
      });
    });
    if (!hasValidPublicLocation) {
      return INVALID_PUBLIC_LOCATION_ERROR(invalidLocation);
    }
  }

  if (hasPrivateLocationsConfigured) {
    let invalidLocation = '';
    const hasValidPrivateLocation = monitorFields.privateLocations?.some((location) => {
      if (privateLocations.length === 0) {
        invalidLocation = location;
        return false;
      }

      return privateLocations.some((supportedLocation) => {
        const locationIsValid = supportedLocation.label === location;
        if (!locationIsValid) {
          invalidLocation = location;
        }
        return locationIsValid;
      });
    });

    if (!hasValidPrivateLocation) {
      return INVALID_PRIVATE_LOCATION_ERROR(invalidLocation);
    }
  }
  const hasEmptyLocations =
    monitorFields.locations &&
    monitorFields.locations.length === 0 &&
    (monitorFields.privateLocations ?? []).length === 0;

  if (hasEmptyLocations) {
    return EMPTY_LOCATION_ERROR;
  }
}

export const INVALID_CONFIGURATION_ERROR = i18n.translate(
  'xpack.synthetics.server.monitors.invalidConfigurationError',
  {
    defaultMessage: "Couldn't save or update monitor because of an invalid configuration.",
  }
);

const INVALID_PAYLOAD_ERROR = i18n.translate(
  'xpack.synthetics.server.monitors.invalidPayloadError',
  {
    defaultMessage: 'Payload is not a valid monitor object',
  }
);

const INVALID_TYPE_ERROR = i18n.translate('xpack.synthetics.server.monitors.invalidTypeError', {
  defaultMessage: 'Monitor type is invalid',
});

const INVALID_SCHEDULE_ERROR = i18n.translate(
  'xpack.synthetics.server.monitors.invalidScheduleError',
  {
    defaultMessage: 'Monitor schedule is invalid',
  }
);

const INVALID_SCHEDULE_DETAILS = (schedule: string) =>
  i18n.translate('xpack.synthetics.server.monitors.invalidScheduleDetails', {
    defaultMessage:
      'Invalid schedule {schedule} minutes supplied to monitor configuration. Supported schedule values in minutes are {allowedSchedulesInMinutes}',
    values: {
      schedule,
      allowedSchedulesInMinutes: ALLOWED_SCHEDULES_IN_MINUTES.join(', '),
    },
  });

const INVALID_SCHEMA_ERROR = (type: string) =>
  i18n.translate('xpack.synthetics.server.monitors.invalidSchemaError', {
    defaultMessage: 'Monitor is not a valid monitor of type {type}',
    values: {
      type,
    },
  });

const EMPTY_LOCATION_ERROR = i18n.translate(
  'xpack.synthetics.server.projectMonitors.locationEmptyError',
  {
    defaultMessage: 'You must add at least one location or private location to this monitor.',
  }
);

const INVALID_PRIVATE_LOCATION_ERROR = (location: string) =>
  i18n.translate('xpack.synthetics.server.projectMonitors.invalidPrivateLocationError', {
    defaultMessage:
      'Invalid private location: "{location}". Remove it or replace it with a valid private location.',
    values: {
      location,
    },
  });

const INVALID_PUBLIC_LOCATION_ERROR = (location: string) =>
  i18n.translate('xpack.synthetics.server.projectMonitors.invalidPublicLocationError', {
    defaultMessage:
      'Invalid location: "{location}". Remove it or replace it with a valid location.',
    values: {
      location,
    },
  });

export const LOCATION_REQUIRED_ERROR = i18n.translate(
  'xpack.synthetics.createMonitor.validation.noLocations',
  {
    defaultMessage:
      'At least one location is required, either elastic managed or private e.g locations: ["us-east"] or private_locations:["test private location"]',
  }
);
