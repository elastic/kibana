/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownComment } from '../../index_properties/markdown/helpers';
import { getFillColor } from '../summary_tab/helpers';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata } from '../../../types';

export const getNotEcsCompliantMarkdownComment = ({
  enrichedFieldMetadata,
  indexName,
  version,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  version: string;
}): string =>
  getMarkdownComment({
    enrichedFieldMetadata,
    indexName,
    suggestedAction: `${i18n.NOT_ECS_COMPLIANT_CALLOUT({
      fieldCount: enrichedFieldMetadata.length,
      version,
    })}
    ${i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}
    ${i18n.DETECTION_ENGINE_RULES_WONT_WORK}
    ${i18n.PAGES_WONT_DISPLAY_EVENTS}
`,
    title: i18n.NOT_ECS_COMPLIANT_CALLOUT_TITLE(enrichedFieldMetadata.length),
  });

export const showNotEcsCompliantCallout = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): boolean => enrichedFieldMetadata.length > 0;

export const getNotEcsCompliantColor = (): string => getFillColor('not-ecs-compliant');
