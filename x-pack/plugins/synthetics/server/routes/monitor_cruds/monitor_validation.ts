/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLeft } from 'fp-ts/lib/Either';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils';

import {
  BrowserFieldsCodec,
  PushBrowserMonitorCodec,
  PushBrowserMonitor,
  ConfigKey,
  DataStream,
  DataStreamCodec,
  HTTPFieldsCodec,
  ICMPSimpleFieldsCodec,
  MonitorFields,
  TCPFieldsCodec,
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

/**
 * Validates monitor fields with respect to the relevant Codec identified by object's 'type' property.
 * @param monitorFields {MonitorFields} The mixed type representing the possible monitor payload from UI.
 */
export function validateMonitor(monitorFields: MonitorFields): {
  valid: boolean;
  reason: string;
  details: string;
  payload: object;
} {
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

  const codec = monitorTypeToCodecMap[monitorType];

  if (!codec) {
    return {
      valid: false,
      reason: `Payload is not a valid monitor object`,
      details: '',
      payload: monitorFields,
    };
  }

  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const decodedMonitor = (codec as typeof ICMPSimpleFieldsCodec).decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: `Monitor is not a valid monitor of type ${monitorType}`,
      details: formatErrors(decodedMonitor.left).join(' | '),
      payload: monitorFields,
    };
  }

  return { valid: true, reason: '', details: '', payload: monitorFields };
}

export function validatePushMonitor(
  monitorFields: PushBrowserMonitor,
  projectId: string
): {
  valid: boolean;
  reason: string;
  details: string;
  payload: object;
} {
  const isValidId = new RegExp(/^[0-9A-Za-z-._~]+$/);
  const isJourneyIdValid = isValidId.test(monitorFields.id);
  const isProjectIdValid = isValidId.test(projectId);
  const projectIdError = !isProjectIdValid
    ? `Project id is invalid. Project id: ${projectId}. `
    : '';
  const journeyIdError = !isJourneyIdValid
    ? `Journey id is invalid. Journey id: ${monitorFields.id}.`
    : '';

  if (!isProjectIdValid || !isJourneyIdValid) {
    return {
      valid: false,
      reason:
        'Failed to save or update monitor. Journey id or Project id is not valid. Id must match pattern ^[0-9A-Za-z-._~]$',
      details: `${projectIdError}${journeyIdError}`,
      payload: monitorFields,
    };
  }
  // Cast it to ICMPCodec to satisfy typing. During runtime, correct codec will be used to decode.
  const decodedMonitor = PushBrowserMonitorCodec.decode(monitorFields);

  if (isLeft(decodedMonitor)) {
    return {
      valid: false,
      reason: `Failed to save or update monitor. Configuration is not valid`,
      details: formatErrors(decodedMonitor.left).join(' | '),
      payload: monitorFields,
    };
  }

  return { valid: true, reason: '', details: '', payload: monitorFields };
}
