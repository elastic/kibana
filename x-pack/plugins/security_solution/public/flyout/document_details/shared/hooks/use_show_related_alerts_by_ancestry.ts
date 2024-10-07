/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { GetFieldsData } from './use_get_fields_data';
import { useIsInvestigateInResolverActionEnabled } from '../../../../detections/components/alerts_table/timeline_actions/investigate_in_resolver';
import { useLicense } from '../../../../common/hooks/use_license';
import { ANCESTOR_ID } from '../constants/field_names';
import { getField } from '../utils';

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
   * Id of the event document
   */
  eventId: string;
  /**
   * Boolean indicating if the flyout is open in preview
   */
  isPreview: boolean;
}

export interface UseShowRelatedAlertsByAncestryResult {
  /**
   * Returns true if the user has at least platinum privilege, and if the document has ancestry data
   */
  show: boolean;
  /**
   * Value of the document id for fetching ancestry alerts
   */
  documentId: string;
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data
 */
export const useShowRelatedAlertsByAncestry = ({
  getFieldsData,
  dataAsNestedObject,
  eventId,
  isPreview,
}: UseShowRelatedAlertsByAncestryParams): UseShowRelatedAlertsByAncestryResult => {
  const hasProcessEntityInfo = useIsInvestigateInResolverActionEnabled(dataAsNestedObject);

  const ancestorId = getField(getFieldsData(ANCESTOR_ID)) ?? '';
  const documentId = isPreview ? ancestorId : eventId;

  const hasAtLeastPlatinum = useLicense().isPlatinumPlus();

  const show = hasProcessEntityInfo && hasAtLeastPlatinum;

  return {
    show,
    documentId,
  };
};
