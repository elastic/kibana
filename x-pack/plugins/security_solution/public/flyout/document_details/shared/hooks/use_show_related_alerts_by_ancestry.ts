/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useMemo } from 'react';
import { find } from 'lodash/fp';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useLicense } from '../../../../common/hooks/use_license';
import { RULE_PARAMETERS_INDEX } from '../constants/field_names';

export interface UseShowRelatedAlertsByAncestryParams {
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

export interface UseShowRelatedAlertsByAncestryResult {
  /**
   * Returns true if the user has at least platinum privilege, and if the document has ancestry data
   */
  show: boolean;
  /**
   * Values of the kibana.alert.rule.parameters.index field
   */
  indices?: string[];
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data
 */
export const useShowRelatedAlertsByAncestry = ({
  getFieldsData,
  dataAsNestedObject,
  dataFormattedForFieldBrowser,
}: UseShowRelatedAlertsByAncestryParams): UseShowRelatedAlertsByAncestryResult => {
  const isRelatedAlertsByProcessAncestryEnabled = useIsExperimentalFeatureEnabled(
    'insightsRelatedAlertsByProcessAncestry'
  );
  const hasProcessEntityInfo = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  // can't use getFieldsData here as the kibana.alert.rule.parameters is different and can be nested
  const originalDocumentIndex = useMemo(
    () => find({ category: 'kibana', field: RULE_PARAMETERS_INDEX }, dataFormattedForFieldBrowser),
    [dataFormattedForFieldBrowser]
  );

  const hasAtLeastPlatinum = useLicense().isPlatinumPlus();

  const show =
    isRelatedAlertsByProcessAncestryEnabled &&
    hasProcessEntityInfo &&
    originalDocumentIndex != null &&
    hasAtLeastPlatinum;

  return {
    show,
    ...(originalDocumentIndex &&
      originalDocumentIndex.values && { indices: originalDocumentIndex.values }),
  };
};
