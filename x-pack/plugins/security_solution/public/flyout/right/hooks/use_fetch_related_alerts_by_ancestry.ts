/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { useAlertPrevalenceFromProcessTree } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';
import { isActiveTimeline } from '../../../helpers';

export interface UseFetchRelatedAlertsByAncestryParams {
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsByAncestryValue {
  /**
   *
   */
  loading: boolean;
  /**
   *
   */
  error: boolean;
  /**
   *
   */
  data: string[] | undefined;
  /**
   *
   */
  dataCount: number;
}

/**
 *
 */
export const useFetchRelatedAlertsByAncestry = ({
  dataFormattedForFieldBrowser,
  scopeId,
}: UseFetchRelatedAlertsByAncestryParams): UseFetchRelatedAlertsByAncestryValue => {
  const processEntityField = find(
    { category: 'process', field: 'process.entity_id' },
    dataFormattedForFieldBrowser
  );
  const originalDocumentId = find(
    { category: 'kibana', field: 'kibana.alert.ancestors.id' },
    dataFormattedForFieldBrowser
  );
  const originalDocumentIndex = find(
    { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
    dataFormattedForFieldBrowser
  );
  const isActiveTimelines = isActiveTimeline(scopeId ?? '');

  const { values: wrappedProcessEntityId } = processEntityField || { values: [] };
  const { values: indices } = originalDocumentIndex || { values: [] };
  const { values: wrappedDocumentId } = originalDocumentId || { values: [] };
  const documentId = Array.isArray(wrappedDocumentId) ? wrappedDocumentId[0] : '';
  const processEntityId = Array.isArray(wrappedProcessEntityId) ? wrappedProcessEntityId[0] : '';
  const { loading, error, alertIds } = useAlertPrevalenceFromProcessTree({
    processEntityId,
    isActiveTimeline: isActiveTimelines,
    documentId,
    indices: indices ?? [],
  });

  return {
    loading,
    error,
    data: alertIds,
    dataCount: (alertIds || []).length,
  };
};
