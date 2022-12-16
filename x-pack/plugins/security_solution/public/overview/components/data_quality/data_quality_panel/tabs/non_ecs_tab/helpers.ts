/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { getFillColor } from '../summary_tab/helpers';
import { getMarkdownComment } from '../../index_properties/markdown/helpers';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata, PartitionedFieldMetadata } from '../../../types';

export const getNonEcsMarkdownComment = ({
  docsCount,
  enrichedFieldMetadata,
  indexName,
  version,
}: {
  docsCount: number;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  version: string;
}): string =>
  getMarkdownComment({
    docsCount,
    enrichedFieldMetadata,
    indexName,
    suggestedAction: `${i18n.NON_ECS_CALLOUT({ fieldCount: enrichedFieldMetadata.length, version })}
${i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WONT_WORK}
${i18n.PAGES_MAY_NOT_DISPLAY_FIELDS}
${i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}
`,
    title: i18n.NON_ECS_CALLOUT_TITLE(enrichedFieldMetadata.length),
  });

export const showNonEcsCallout = (enrichedFieldMetadata: EnrichedFieldMetadata[]): boolean =>
  enrichedFieldMetadata.length > 0;

export const getNonEcsColor = (partitionedFieldMetadata: PartitionedFieldMetadata): string =>
  showNonEcsCallout(partitionedFieldMetadata.nonEcs)
    ? getFillColor('non-ecs')
    : euiThemeVars.euiTextColor;
