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

import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import {
  BrowserFieldsCodec,
  ProjectMonitorCodec,
  ProjectMonitor,
  ConfigKey,
  MonitorTypeEnum,
  MonitorTypeCodec,
  HTTPFieldsCodec,
  MonitorFields,
  TCPFieldsCodec,
  SyntheticsMonitor,
  Locations,
  ICMPFieldsCodec,
} from '../../../common/runtime_types';

import { ALLOWED_SCHEDULES_IN_MINUTES } from '../../../common/constants/monitor_defaults';

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

/**
 * Validates monitor fields with respect to the relevant Codec identified by object's 'type' property.
 * @param monitorFields {MonitorFields} The mixed type representing the possible monitor payload from UI.
 */
export function validateMonitor(monitorFields: MonitorFields): ValidationResult {
  const { [ConfigKey.MONITOR_TYPE]: monitorType } = monitorFields;

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

  return {
    valid: true,
    reason: '',
    details: '',
    payload: monitorFields,
    decodedMonitor: decodedMonitor.right,
  };
}

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

const INVALID_CONFIGURATION_ERROR = i18n.translate(
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
      'Invalid schedule {schedule} minutes supplied to monitor configuration. Please use a supported monitor schedule.',
    values: {
      schedule,
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
