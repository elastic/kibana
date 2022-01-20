/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { tEnum } from '../../utils/t_enum';

export enum DataStream {
  HTTP = 'http',
  TCP = 'tcp',
  ICMP = 'icmp',
  BROWSER = 'browser',
}

export const DataStreamCodec = tEnum<DataStream>('DataStream', DataStream);
export type DataStreamType = t.TypeOf<typeof DataStreamCodec>;

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export const HTTPMethodCodec = tEnum<HTTPMethod>('HTTPMethod', HTTPMethod);
export type HTTPMethodType = t.TypeOf<typeof HTTPMethodCodec>;

export enum ResponseBodyIndexPolicy {
  ALWAYS = 'always',
  NEVER = 'never',
  ON_ERROR = 'on_error',
}

export const ResponseBodyIndexPolicyCodec = tEnum<ResponseBodyIndexPolicy>(
  'ResponseBodyIndexPolicy',
  ResponseBodyIndexPolicy
);
export type ResponseBodyIndexPolicyType = t.TypeOf<typeof ResponseBodyIndexPolicyCodec>;

export enum MonacoEditorLangId {
  JSON = 'xjson',
  PLAINTEXT = 'plaintext',
  XML = 'xml',
  JAVASCRIPT = 'javascript',
}

export const MonacoEditorLangIdCodec = tEnum<MonacoEditorLangId>(
  'MonacoEditorLangId',
  MonacoEditorLangId
);
export type MonacoEditorLangIdType = t.TypeOf<typeof MonacoEditorLangIdCodec>;

export enum Mode {
  FORM = 'form',
  JSON = 'json',
  PLAINTEXT = 'text',
  XML = 'xml',
}

export const ModeCodec = tEnum<Mode>('Mode', Mode);
export type ModeType = t.TypeOf<typeof ModeCodec>;

export enum ContentType {
  JSON = 'application/json',
  TEXT = 'text/plain',
  XML = 'application/xml',
  FORM = 'application/x-www-form-urlencoded',
}

export const ContentTypeCodec = tEnum<ContentType>('ContentType', ContentType);
export type ContentTypeType = t.TypeOf<typeof ContentTypeCodec>;

export enum ScheduleUnit {
  MINUTES = 'm',
  SECONDS = 's',
}

export const ScheduleUnitCodec = tEnum<ScheduleUnit>('ScheduleUnit', ScheduleUnit);
export type ScheduleUnitType = t.TypeOf<typeof ScheduleUnitCodec>;

export enum VerificationMode {
  CERTIFICATE = 'certificate',
  FULL = 'full',
  NONE = 'none',
  STRICT = 'strict',
}

export const VerificationModeCodec = tEnum<VerificationMode>('VerificationMode', VerificationMode);
export type VerificationModeType = t.TypeOf<typeof VerificationModeCodec>;

export enum TLSVersion {
  ONE_ZERO = 'TLSv1.0',
  ONE_ONE = 'TLSv1.1',
  ONE_TWO = 'TLSv1.2',
  ONE_THREE = 'TLSv1.3',
}

export const TLSVersionCodec = tEnum<TLSVersion>('TLSVersion', TLSVersion);
export type TLSVersionType = t.TypeOf<typeof TLSVersionCodec>;

export enum ScreenshotOption {
  ON = 'on',
  OFF = 'off',
  ONLY_ON_FAILURE = 'only-on-failure',
}

export const ScreenshotOptionCodec = tEnum<ScreenshotOption>('ScreenshotOption', ScreenshotOption);
export type ScreenshotOptionType = t.TypeOf<typeof ScreenshotOptionCodec>;

export enum ThrottlingSuffix {
  DOWNLOAD = 'd',
  UPLOAD = 'u',
  LATENCY = 'l',
}

export const ThrottlingSuffixCodec = tEnum<ThrottlingSuffix>('ThrottlingSuffix', ThrottlingSuffix);
export type ThrottlingSuffixType = t.TypeOf<typeof ThrottlingSuffixCodec>;
