/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { getMarkdownComment } from '../../index_properties/markdown/helpers';
import { getFillColor } from '../summary_tab/helpers';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata, PartitionedFieldMetadata } from '../../../types';

export const getMissingTimestampComment = ({
  enrichedFieldMetadata,
  indexName,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
}): string => {
  const timestampMetadata = enrichedFieldMetadata.find((x) => x.name === '@timestamp');
  const metadata = timestampMetadata != null ? [timestampMetadata] : [];

  return getMarkdownComment({
    enrichedFieldMetadata: metadata,
    indexName,
    suggestedAction: `${i18n.MISSING_TIMESTAMP_CALLOUT}
${i18n.DETECTION_ENGINE_RULES_WONT_WORK}
${i18n.PAGES_WONT_DISPLAY_EVENTS}
`,
    title: i18n.MISSING_TIMESTAMP_CALLOUT_TITLE,
  });
};

export const showMissingTimestampCallout = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): boolean => enrichedFieldMetadata.length === 0;

export const getEcsCompliantColor = (partitionedFieldMetadata: PartitionedFieldMetadata): string =>
  showMissingTimestampCallout(partitionedFieldMetadata.ecsCompliant)
    ? euiThemeVars.euiColorDanger
    : getFillColor('ecs-compliant');
