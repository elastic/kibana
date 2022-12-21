/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

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
} from '../../../common/runtime_types';

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

export function validateProjectMonitor(monitorFields: ProjectMonitor): ValidationResult {
  const locationsError =
    monitorFields.locations &&
    monitorFields.locations.length === 0 &&
    (monitorFields.privateLocations ?? []).length === 0
      ? 'Invalid value "[]" supplied to field "locations"'
      : '';
  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const decodedMonitor = ProjectMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: `Failed to save or update monitor. Configuration is not valid`,
      details: [...formatErrors(decodedMonitor.left), locationsError]
        .filter((error) => error !== '')
        .join(' | '),
      payload: monitorFields,
    };
  }

  if (locationsError) {
    return {
      valid: false,
      reason: `Failed to save or update monitor. Configuration is not valid`,
      details: locationsError,
      payload: monitorFields,
    };
  }

  return { valid: true, reason: '', details: '', payload: monitorFields };
}
