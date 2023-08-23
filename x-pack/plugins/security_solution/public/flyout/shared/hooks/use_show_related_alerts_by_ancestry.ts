/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { isInvestigateInResolverActionEnabled } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useLicense } from '../../../common/hooks/use_license';

export interface UseShowRelatedAlertsByAncestryParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data
 */
export const useShowRelatedAlertsByAncestry = ({
  dataFormattedForFieldBrowser,
  dataAsNestedObject,
}: UseShowRelatedAlertsByAncestryParams): boolean => {
  const isRelatedAlertsByProcessAncestryEnabled = useIsExperimentalFeatureEnabled(
    'insightsRelatedAlertsByProcessAncestry'
  );
  const hasProcessEntityInfo = isInvestigateInResolverActionEnabled(
    dataAsNestedObject || undefined
  );

  const originalDocumentId = find(
    { category: 'kibana', field: 'kibana.alert.ancestors.id' },
    dataFormattedForFieldBrowser
  );
  const originalDocumentIndex = find(
    { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
    dataFormattedForFieldBrowser
  );

  const canShowAncestryInsight =
    isRelatedAlertsByProcessAncestryEnabled &&
    hasProcessEntityInfo &&
    originalDocumentId &&
    originalDocumentIndex;
  const hasAtLeastPlatinum = useLicense().isPlatinumPlus();

  return canShowAncestryInsight != null && canShowAncestryInsight && hasAtLeastPlatinum;
};
