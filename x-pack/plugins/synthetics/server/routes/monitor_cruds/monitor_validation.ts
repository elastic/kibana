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

import {
  BrowserFieldsCodec,
  ProjectMonitorCodec,
  ProjectMonitor,
  ConfigKey,
  DataStream,
  DataStreamCodec,
  HTTPFieldsCodec,
  ICMPSimpleFieldsCodec,
  MonitorFields,
  TCPFieldsCodec,
  SyntheticsMonitor,
  Locations,
  PrivateLocation,
} from '../../../common/runtime_types';

import { ALLOWED_SCHEDULES_IN_MINUTES } from '../../../common/constants/monitor_defaults';

type MonitorCodecType =
  | typeof ICMPSimpleFieldsCodec
  | typeof TCPFieldsCodec
  | typeof HTTPFieldsCodec
  | typeof BrowserFieldsCodec;

const monitorTypeToCodecMap: Record<DataStream, MonitorCodecType> = {
  [DataStream.ICMP]: ICMPSimpleFieldsCodec,
  [DataStream.TCP]: TCPFieldsCodec,
  [DataStream.HTTP]: HTTPFieldsCodec,
  [DataStream.BROWSER]: BrowserFieldsCodec,
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

  const decodedType = DataStreamCodec.decode(monitorType);

  if (isLeft(decodedType)) {
    return {
      valid: false,
      reason: `Monitor type is invalid`,
      details: formatErrors(decodedType.left).join(' | '),
      payload: monitorFields,
    };
  }

  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const SyntheticsMonitorCodec = monitorTypeToCodecMap[monitorType] as typeof ICMPSimpleFieldsCodec;

  if (!SyntheticsMonitorCodec) {
    return {
      valid: false,
      reason: `Payload is not a valid monitor object`,
      details: '',
      payload: monitorFields,
    };
  }

  if (!ALLOWED_SCHEDULES_IN_MINUTES.includes(monitorFields[ConfigKey.SCHEDULE].number)) {
    return {
      valid: false,
      reason: `Monitor schedule is invalid`,
      details: `Invalid schedule ${
        monitorFields[ConfigKey.SCHEDULE].number
      } minutes supplied to monitor configuration. Please use a supported monitor schedule.`,
      payload: monitorFields,
    };
  }

  const ExactSyntheticsMonitorCodec = t.exact(SyntheticsMonitorCodec);
  const decodedMonitor = ExactSyntheticsMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: `Monitor is not a valid monitor of type ${monitorType}`,
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
  privateLocations: PrivateLocation[]
): ValidationResult {
  const locationsError = validateLocation(monitorFields, publicLocations, privateLocations);
  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const decodedMonitor = ProjectMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: "Couldn't save or update monitor because of an invalid configuration.",
      details: [...formatErrors(decodedMonitor.left), locationsError]
        .filter((error) => error !== '' && error !== undefined)
        .join(' | '),
      payload: monitorFields,
    };
  }

  if (locationsError) {
    return {
      valid: false,
      reason: "Couldn't save or update monitor because of an invalid configuration.",
      details: locationsError,
      payload: monitorFields,
    };
  }

  return { valid: true, reason: '', details: '', payload: monitorFields };
}

export function validateLocation(
  monitorFields: ProjectMonitor,
  publicLocations: Locations,
  privateLocations: PrivateLocation[]
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
