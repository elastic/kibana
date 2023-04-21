/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { hasData } from '../../../common/components/event_details/insights/helpers';
import { hasCorrectAgentTypeAndEventModule } from '../../../common/components/event_details/insights/insights';
import { useLicense } from '../../../common/hooks/use_license';

export interface UseShowRelatedAlertsByAncestryParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
}

/**
 * Returns true if the user has at least platinum privilege, and if the document has ancestry data
 */
export const useShowRelatedAlertsByAncestry = ({
  dataFormattedForFieldBrowser,
}: UseShowRelatedAlertsByAncestryParams): boolean => {
  const isRelatedAlertsByProcessAncestryEnabled = useIsExperimentalFeatureEnabled(
    'insightsRelatedAlertsByProcessAncestry'
  );
  const agentTypeField = find(
    { category: 'agent', field: 'agent.type' },
    dataFormattedForFieldBrowser
  );
  const eventModuleField = find(
    { category: 'event', field: 'event.module' },
    dataFormattedForFieldBrowser
  );
  const processEntityField = find(
    { category: 'process', field: 'process.entity_id' },
    dataFormattedForFieldBrowser
  );
  const hasProcessEntityInfo =
    hasData(processEntityField) &&
    hasCorrectAgentTypeAndEventModule(agentTypeField, eventModuleField);
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
