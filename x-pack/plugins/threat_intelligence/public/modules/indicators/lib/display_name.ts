/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Indicator, RawIndicatorFieldId } from '../../../../common/types/indicator';
import { unwrapValue } from './unwrap_value';

type IndicatorDisplayName = [RawIndicatorFieldId, string | null];
interface IndicatorDisplayNameAsObject {
  field: RawIndicatorFieldId;
  value: string | null;
}
type IndicatorDisplayNameExtractor = (indicator: Indicator) => IndicatorDisplayName;
type IndicatorTypePredicate = (indicatorType: string | null) => boolean;

type MapperRule = [predicate: IndicatorTypePredicate, extract: IndicatorDisplayNameExtractor];

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
const extractIp: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.Ip,
  unwrapValue(indicator, RawIndicatorFieldId.Ip),
];

const extractUrl: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.UrlOriginal,
  unwrapValue(indicator, RawIndicatorFieldId.UrlOriginal),
];

const extractId: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.Id,
  unwrapValue(indicator, RawIndicatorFieldId.Id),
];

const extractFile: IndicatorDisplayNameExtractor = (indicator: Indicator) => {
  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha256)) {
    return [RawIndicatorFieldId.FileSha256, unwrapValue(indicator, RawIndicatorFieldId.FileSha256)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileMd5)) {
    return [RawIndicatorFieldId.FileMd5, unwrapValue(indicator, RawIndicatorFieldId.FileMd5)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha1)) {
    return [RawIndicatorFieldId.FileSha1, unwrapValue(indicator, RawIndicatorFieldId.FileSha1)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha512)) {
    return [RawIndicatorFieldId.FileSha512, unwrapValue(indicator, RawIndicatorFieldId.FileSha512)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha224)) {
    return [RawIndicatorFieldId.FileSha224, unwrapValue(indicator, RawIndicatorFieldId.FileSha224)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha384)) {
    return [RawIndicatorFieldId.FileSha384, unwrapValue(indicator, RawIndicatorFieldId.FileSha384)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha3224)) {
    return [
      RawIndicatorFieldId.FileSha3224,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha3224),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha3256)) {
    return [
      RawIndicatorFieldId.FileSha3256,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha3256),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha3384)) {
    return [
      RawIndicatorFieldId.FileSha3384,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha3384),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha3512)) {
    return [
      RawIndicatorFieldId.FileSha3512,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha3512),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha512224)) {
    return [
      RawIndicatorFieldId.FileSha512224,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha512224),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSha512256)) {
    return [
      RawIndicatorFieldId.FileSha512256,
      unwrapValue(indicator, RawIndicatorFieldId.FileSha512256),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileSSDeep)) {
    return [RawIndicatorFieldId.FileSSDeep, unwrapValue(indicator, RawIndicatorFieldId.FileSSDeep)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileTlsh)) {
    return [RawIndicatorFieldId.FileTlsh, unwrapValue(indicator, RawIndicatorFieldId.FileTlsh)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileImpfuzzy)) {
    return [
      RawIndicatorFieldId.FileImpfuzzy,
      unwrapValue(indicator, RawIndicatorFieldId.FileImpfuzzy),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileImphash)) {
    return [
      RawIndicatorFieldId.FileImphash,
      unwrapValue(indicator, RawIndicatorFieldId.FileImphash),
    ];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FilePehash)) {
    return [RawIndicatorFieldId.FilePehash, unwrapValue(indicator, RawIndicatorFieldId.FilePehash)];
  }

  if (unwrapValue(indicator, RawIndicatorFieldId.FileVhash)) {
    return [RawIndicatorFieldId.FileVhash, unwrapValue(indicator, RawIndicatorFieldId.FileVhash)];
  }

  return extractId(indicator);
};

const extractEmailAddress: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.EmailAddress,
  unwrapValue(indicator, RawIndicatorFieldId.EmailAddress),
];

const extractDomain: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.UrlDomain,
  unwrapValue(indicator, RawIndicatorFieldId.UrlDomain),
];

const extractX509Serial: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.X509Serial,
  unwrapValue(indicator, RawIndicatorFieldId.X509Serial),
];

const extractWindowsRegistryKey: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.WindowsRegistryKey,
  unwrapValue(indicator, RawIndicatorFieldId.WindowsRegistryKey),
];

const extractAutonomousSystemNumber: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.AutonomousSystemNumber,
  unwrapValue(indicator, RawIndicatorFieldId.AutonomousSystemNumber),
];

const extractMacAddress: IndicatorDisplayNameExtractor = (indicator: Indicator) => [
  RawIndicatorFieldId.MacAddress,
  unwrapValue(indicator, RawIndicatorFieldId.MacAddress),
];

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
const findMappingRule = (indicatorType: string | null): IndicatorDisplayNameExtractor => {
  const [_, extract = extractId] = rulesArray.find(([check]) => check(indicatorType)) || [];
  return extract;
};

/**
 * Cached rules for indicator types
 */
const rules: Record<string, IndicatorDisplayNameExtractor> = {};

/**
 * Find and return indicator display name structure {field, value}
 */
export const getDisplayName = (indicator: Indicator): IndicatorDisplayNameAsObject => {
  const indicatorType = (unwrapValue(indicator, RawIndicatorFieldId.Type) || '').toLowerCase();

  if (!rules[indicatorType]) {
    rules[indicatorType] = findMappingRule(indicatorType);
  }

  const [field, value] = rules[indicatorType](indicator);

  return { field, value };
};
