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

/**
 * Display value extraction logic
 */
const extractStub = () => null;

const extractIp = (indicator: Indicator) => unwrapValue(indicator, RawIndicatorFieldId.Ip);

const extractUrl = (indicator: Indicator) => unwrapValue(indicator, RawIndicatorFieldId.UrlFull);

const extractFile = (indicator: Indicator) =>
  unwrapValue(indicator, RawIndicatorFieldId.FileSha256);

/**
 * Pairs rule condition with display value extraction logic
 */
const rulesArray: MapperRule[] = [
  [isIpIndicator, extractIp],
  [isUrlIndicator, extractUrl],
  [isFileIndicator, extractFile],
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
