/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  INDICATOR_DESTINATION_PATH,
} from '../../../../../common/constants';
import { ENRICHMENT_TYPES, PROVIDER } from '../../../../../common/cti/constants';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getDataFromSourceHits } from '../../../../../common/utils/field_formatters';
import * as i18n from './translations';

const isEventDetailsItem = (
  item: TimelineEventsDetailsItem[] | null
): item is TimelineEventsDetailsItem[] => !!item;

export const parseExistingEnrichments = (
  data: TimelineEventsDetailsItem[]
): TimelineEventsDetailsItem[][] => {
  const threatIndicatorField = data.find(
    ({ field, originalValue }) => field === INDICATOR_DESTINATION_PATH && originalValue
  );
  if (!threatIndicatorField) {
    return [];
  }

  const { originalValue } = threatIndicatorField;
  const enrichmentStrings = Array.isArray(originalValue) ? originalValue : [originalValue];

  return enrichmentStrings
    .map((enrichmentString) => {
      try {
        const enrichment = JSON.parse(enrichmentString);
        return getDataFromSourceHits(enrichment);
      } catch (e) {
        return null;
      }
    })
    .filter(isEventDetailsItem);
};

export const timelineDataToEnrichment = (data: TimelineEventsDetailsItem[]): CtiEnrichment =>
  data.reduce<CtiEnrichment>((acc, item) => {
    acc[item.field] = item.originalValue;
    return acc;
  }, {});

export const getTooltipTitle = (type: string | undefined) =>
  type === ENRICHMENT_TYPES.InvestigationTime
    ? i18n.INVESTIGATION_TOOLTIP_TITLE
    : i18n.INDICATOR_TOOLTIP_TITLE;

export const getTooltipContent = (type: string | undefined) =>
  type === ENRICHMENT_TYPES.InvestigationTime
    ? i18n.INVESTIGATION_TOOLTIP_CONTENT
    : i18n.INDICATOR_TOOLTIP_CONTENT;

export const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;

export const getEnrichmentValue = (enrichment: CtiEnrichment, field: string) =>
  getFirstElement(enrichment[field]) as string | undefined;

/**
 * This value may be in one of two locations depending on whether it's an
 * old indicator alert or a new enrichment. Once enrichment has been
 * normalized and we support the new ECS fields, this value should always be
 * 'indicator.provider';
 */
export const getEnrichmentProvider = (enrichment: CtiEnrichment) =>
  getEnrichmentValue(enrichment, PROVIDER) ||
  getEnrichmentValue(enrichment, `${DEFAULT_INDICATOR_SOURCE_PATH}.${PROVIDER}`);
