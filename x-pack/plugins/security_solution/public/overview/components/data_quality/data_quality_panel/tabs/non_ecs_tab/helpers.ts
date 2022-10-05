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
  enrichedFieldMetadata,
  indexName,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
}): string =>
  getMarkdownComment({
    enrichedFieldMetadata,
    indexName,
    suggestedAction: `${i18n.NON_ECS_CALLOUT(enrichedFieldMetadata.length)}
${i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WONT_WORK}
${i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}
${i18n.TIMELINE_AND_TEMPLATES_MAY_NOT_OPERATE_PROPERLY}
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
