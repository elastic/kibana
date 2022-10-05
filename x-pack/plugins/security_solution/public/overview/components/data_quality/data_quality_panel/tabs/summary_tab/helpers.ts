/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';

import { assertUnreachable } from '../../../../../../../common/utility_types';
import {
  getMissingTimestampComment,
  showMissingTimestampCallout,
} from '../ecs_compliant_tab/helpers';
import {
  ALL_TAB_ID,
  ECS_COMPLIANT_TAB_ID,
  NON_ECS_TAB_ID,
  NOT_ECS_COMPLIANT_TAB_ID,
} from '../../index_properties/helpers';
import { getNonEcsMarkdownComment, showNonEcsCallout } from '../non_ecs_tab/helpers';
import {
  getNotEcsCompliantMarkdownComment,
  showNotEcsCompliantCallout,
} from '../not_ecs_compliant_tab/helpers';
import * as i18n from '../../index_properties/translations';
import type { PartitionedFieldMetadata } from '../../../types';

export type CategoryId = 'not-ecs-compliant' | 'non-ecs' | 'ecs-compliant';

interface SummaryData {
  categoryId: CategoryId;
  mappings: number;
}

export const getSummaryData = (
  partitionedFieldMetadata: PartitionedFieldMetadata
): SummaryData[] => [
  { categoryId: 'not-ecs-compliant', mappings: partitionedFieldMetadata.notEcsCompliant.length },
  { categoryId: 'non-ecs', mappings: partitionedFieldMetadata.nonEcs.length },
  { categoryId: 'ecs-compliant', mappings: partitionedFieldMetadata.ecsCompliant.length },
];

export const getFillColor = (categoryId: CategoryId): string => {
  switch (categoryId) {
    case 'not-ecs-compliant':
      return euiThemeVars.euiColorDanger;
    case 'non-ecs':
      return euiThemeVars.euiColorWarning;
    case 'ecs-compliant':
      return euiThemeVars.euiColorSuccess;
    default:
      assertUnreachable(categoryId);
      return euiThemeVars.euiColorGhost;
  }
};

export const getNodeLabel = (categoryId: CategoryId): string => {
  switch (categoryId) {
    case 'not-ecs-compliant':
      return i18n.NOT_ECS_COMPLIANT;
    case 'non-ecs':
      return i18n.NON_ECS;
    case 'ecs-compliant':
      return i18n.ECS_COMPLIANT;
    default:
      assertUnreachable(categoryId);
      return i18n.UNKNOWN;
  }
};

export const getTabId = (groupByField: string): string => {
  switch (groupByField) {
    case 'not-ecs-compliant':
      return NOT_ECS_COMPLIANT_TAB_ID;
    case 'non-ecs':
      return NON_ECS_TAB_ID;
    case 'ecs-compliant':
      return ECS_COMPLIANT_TAB_ID;
    default:
      return ALL_TAB_ID;
  }
};

const isString = (x: string | null): x is string => typeof x === 'string';

export const getMarkdownComments = ({
  indexName,
  partitionedFieldMetadata,
}: {
  indexName: string;
  partitionedFieldMetadata: PartitionedFieldMetadata;
}): string[] => {
  const notEcsCompliantMarkdownComment = showNotEcsCompliantCallout(
    partitionedFieldMetadata.notEcsCompliant
  )
    ? getNotEcsCompliantMarkdownComment({
        enrichedFieldMetadata: partitionedFieldMetadata.notEcsCompliant,
        indexName,
      })
    : null;

  const nonEcsMarkdownComment = showNonEcsCallout(partitionedFieldMetadata.nonEcs)
    ? getNonEcsMarkdownComment({
        enrichedFieldMetadata: partitionedFieldMetadata.nonEcs,
        indexName,
      })
    : null;

  const showMissingTimestampComment = showMissingTimestampCallout(
    partitionedFieldMetadata.ecsCompliant
  )
    ? getMissingTimestampComment({
        enrichedFieldMetadata: partitionedFieldMetadata.ecsCompliant,
        indexName,
      })
    : null;

  return [
    notEcsCompliantMarkdownComment,
    nonEcsMarkdownComment,
    showMissingTimestampComment,
  ].filter(isString);
};
