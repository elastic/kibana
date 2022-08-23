/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';
import { unwrapValue } from './unwrap_value';

export type IndicatorValueExtractor = (indicator: Indicator) => string | null;
export type IndicatorTypePredicate = (indicatorType: string | null) => boolean;

type MapperRule = [predicate: IndicatorTypePredicate, extract: IndicatorValueExtractor];

/**
 * Predicates to help identify indicator by type
 */
const isIpIndicator: IndicatorTypePredicate = (indicatorType) =>
  !!indicatorType && ['ipv4-addr', 'ipv6-addr'].includes(indicatorType);

const isFileIndicator: IndicatorTypePredicate = (indicatorType) => indicatorType === 'file';
const isUrlIndicator: IndicatorTypePredicate = (indicatorType) => indicatorType === 'url';
const isEmailAddress: IndicatorTypePredicate = (indicatorType) => indicatorType === 'email-addr';
const isDomain: IndicatorTypePredicate = (indicatorType) =>
  !!indicatorType && ['domain', 'domain-name'].includes(indicatorType);
const isX509Certificate: IndicatorTypePredicate = (indicatorType) =>
  !!indicatorType && ['x509-certificate', 'x509 serial'].includes(indicatorType);
const isUnknownIndicator: IndicatorTypePredicate = (indicatorType) =>
  !!indicatorType && ['unknown', 'email', 'email-message'].includes(indicatorType);
const isWindowsRegistryKey: IndicatorTypePredicate = (indicatorType) =>
  indicatorType === 'windows-registry-key';
const isAutonomousSystem: IndicatorTypePredicate = (indicatorType) =>
  indicatorType === 'autonomous-system';
const isMacAddress: IndicatorTypePredicate = (indicatorType) => indicatorType === 'mac-addr';

/**
 * Display value extraction logic
 */
const extractStub = () => null;

const extractIp = (indicator: Indicator) => unwrapValue(indicator, RawIndicatorFieldId.Ip);

const extractUrl = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.UrlOriginal);

const extractFile = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.FileSha256) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileMd5) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha1) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha512) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha224) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha384) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha3224) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha3256) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha3384) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha3512) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha512224) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSha512256) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileSSDeep) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileTlsh) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileImpfuzzy) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileImphash) ||
  unwrapValue(indicator, RawIndicatorFieldId.FilePehash) ||
  unwrapValue(indicator, RawIndicatorFieldId.FileVhash);

const extractEmailAddress = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.EmailAddress);

const extractDomain = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.UrlDomain);

const extractX509Serial = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.X509Serial);

const extractWindowsRegistryKey = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.WindowsRegistryKey);

const extractAutonomousSystemNumber = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.AutonomousSystemNumber);

const extractMacAddress = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.MacAddress);

const extractId = (indicator: Indicator) => unwrapValue(indicator, RawIndicatorFieldId.Id);

/**
 * Pairs rule condition with display value extraction logic
 */
const rulesArray: MapperRule[] = [
  [isIpIndicator, extractIp],
  [isUrlIndicator, extractUrl],
  [isFileIndicator, extractFile],
  [isUnknownIndicator, extractId],
  [isEmailAddress, extractEmailAddress],
  [isDomain, extractDomain],
  [isX509Certificate, extractX509Serial],
  [isWindowsRegistryKey, extractWindowsRegistryKey],
  [isAutonomousSystem, extractAutonomousSystemNumber],
  [isMacAddress, extractMacAddress],
];

/**
 * Finds display value mapping function for given indicatorType
 */
const findMappingRule = (indicatorType: string | null): IndicatorValueExtractor => {
  const [_, extract = extractStub] = rulesArray.find(([check]) => check(indicatorType)) || [];
  return extract;
};

/**
 * Cached rules for indicator types
 */
const rules: Record<string, IndicatorValueExtractor> = {};

/**
 * Mapping between the indicator type and the {@link RawIndicatorFieldId}.
 */
const indicatorTypeToField: { [id: string]: RawIndicatorFieldId } = {
  file: RawIndicatorFieldId.FileSha256,
  'ipv4-addr': RawIndicatorFieldId.Ip,
  'ipv6-addr': RawIndicatorFieldId.Ip,
  url: RawIndicatorFieldId.UrlFull,
};

/**
 * Find and return indicator display value field
 */
export const displayField = (indicator: Indicator): string | null => {
  const indicatorType = (unwrapValue(indicator, RawIndicatorFieldId.Type) || '').toLowerCase();

  return indicatorTypeToField[indicatorType];
};

/**
 * Find and return indicator display value, if possible
 */
export const displayValue = (indicator: Indicator): string | null => {
  const indicatorType = (unwrapValue(indicator, RawIndicatorFieldId.Type) || '').toLowerCase();

  if (!rules[indicatorType]) {
    rules[indicatorType] = findMappingRule(indicatorType);
  }

  return rules[indicatorType](indicator);
};
