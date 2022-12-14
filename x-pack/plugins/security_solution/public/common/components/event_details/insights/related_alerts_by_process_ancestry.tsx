/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { EuiBetaBadge, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import type { Filter } from '@kbn/es-query';
import { isActiveTimeline } from '../../../../helpers';
import type { DataProvider } from '../../../../../common/types';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { getDataProvider } from '../table/use_action_cell_data_provider';
import { useAlertPrevalenceFromProcessTree } from '../../../containers/alerts/use_alert_prevalence_from_process_tree';
import { InsightAccordion } from './insight_accordion';
import { SimpleAlertTable } from './simple_alert_table';
import { InvestigateInTimelineButton } from '../table/investigate_in_timeline_button';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../detections/components/alerts_table/translations';
import {
  PROCESS_ANCESTRY,
  PROCESS_ANCESTRY_COUNT,
  PROCESS_ANCESTRY_EMPTY,
  PROCESS_ANCESTRY_ERROR,
  PROCESS_ANCESTRY_FILTER,
} from './translations';
import { BETA } from '../../../translations';

interface Props {
  data: TimelineEventsDetailsItem;
  eventId: string;
  index: TimelineEventsDetailsItem;
  originalDocumentId: TimelineEventsDetailsItem;
  scopeId?: string;
}

interface Cache {
  alertIds: string[];
}

const dataProviderLimit = 5;

/**
 * Fetches and displays alerts that were generated in the associated process'
 * process tree.
 * Offers the ability to dive deeper into the investigation by opening
 * the related alerts in a timeline investigation.
 *
 * In contrast to other insight accordions, this one does not fetch the
 * count and alerts on mount since the call to fetch the process tree
 * and its associated alerts is quite expensive.
 * The component requires users to click on the accordion in order to
 * initiate the fetch of the associated events.
 *
 * In order to achieve this, this component orchestrates two helper
 * components:
 *
 * RelatedAlertsByProcessAncestry (empty cache)
 *     user clicks -->
 *         FetchAndNotifyCachedAlertsByProcessAncestry (fetches data, shows loading state)
 *     cache loaded -->
 *         ActualRelatedAlertsByProcessAncestry (displays data)
 *
 * The top-level component maintains a "cache" state that is used for
 * state management and to prevent double-fetching in case the
 * accordion is closed and re-opened.
 *
 * Due to the ephemeral nature of the data, it was decided to keep the
 * state inside the component rather than to add it to Redux.
 */
export const RelatedAlertsByProcessAncestry = React.memo<Props>(
  ({ data, originalDocumentId, index, eventId, scopeId }) => {
    const [showContent, setShowContent] = useState(false);
    const [cache, setCache] = useState<Partial<Cache>>({});

    const onToggle = useCallback((isOpen: boolean) => setShowContent(isOpen), []);

    // Makes sure the component is not fetching data before the accordion
    // has been openend.
    const renderContent = useCallback(() => {
      if (!showContent) {
        return null;
      } else if (cache.alertIds) {
        return (
          <ActualRelatedAlertsByProcessAncestry
            eventId={eventId}
            scopeId={scopeId}
            alertIds={cache.alertIds}
          />
        );
      }
      return (
        <FetchAndNotifyCachedAlertsByProcessAncestry
          data={data}
          index={index}
          originalDocumentId={originalDocumentId}
          eventId={eventId}
          isActiveTimelines={isActiveTimeline(scopeId ?? '')}
          onCacheLoad={setCache}
        />
      );
    }, [showContent, cache.alertIds, data, index, originalDocumentId, eventId, scopeId]);

    const betaBadge = useMemo(() => <EuiBetaBadge size="s" label={BETA} color="subdued" />, []);

    return (
      <InsightAccordion
        prefix="RelatedAlertsByProcessAncestry"
        // `renderContent` and the associated sub-components are making sure to
        // render the correct loading and error states so we can omit these states here
        state="success"
        text={
          // If we have fetched the alerts, display the count here, otherwise omit the count
          cache.alertIds ? PROCESS_ANCESTRY_COUNT(cache.alertIds.length) : PROCESS_ANCESTRY
        }
        renderContent={renderContent}
        onToggle={onToggle}
        extraAction={betaBadge}
      />
    );
  }
);

RelatedAlertsByProcessAncestry.displayName = 'RelatedAlertsByProcessAncestry';

/**
 * Fetches data, displays a loading and error state and notifies about on success
 */
const FetchAndNotifyCachedAlertsByProcessAncestry: React.FC<{
  data: TimelineEventsDetailsItem;
  eventId: string;
  index: TimelineEventsDetailsItem;
  originalDocumentId: TimelineEventsDetailsItem;
  isActiveTimelines: boolean;
  onCacheLoad: (cache: Cache) => void;
}> = ({ data, originalDocumentId, index, isActiveTimelines, onCacheLoad, eventId }) => {
  const { values: wrappedProcessEntityId } = data;
  const { values: indices } = index;
  const { values: wrappedDocumentId } = originalDocumentId;
  const documentId = Array.isArray(wrappedDocumentId) ? wrappedDocumentId[0] : '';
  const processEntityId = Array.isArray(wrappedProcessEntityId) ? wrappedProcessEntityId[0] : '';
  const { loading, error, alertIds } = useAlertPrevalenceFromProcessTree({
    processEntityId,
    isActiveTimeline: isActiveTimelines,
    documentId,
    indices: indices ?? [],
  });

  useEffect(() => {
    if (alertIds && alertIds.length !== 0) {
      onCacheLoad({ alertIds });
    }
  }, [alertIds, onCacheLoad]);

  if (loading) {
    return <EuiLoadingSpinner />;
  } else if (error) {
    return <>{PROCESS_ANCESTRY_ERROR}</>;
  } else if (!alertIds || alertIds.length === 0) {
    return <>{PROCESS_ANCESTRY_EMPTY}</>;
  }

  return null;
};

FetchAndNotifyCachedAlertsByProcessAncestry.displayName =
  'FetchAndNotifyCachedAlertsByProcessAncestry';

/**
 * Renders the alert table and the timeline button from a filled cache.
 */
const ActualRelatedAlertsByProcessAncestry: React.FC<{
  alertIds: string[];
  eventId: string;
  scopeId?: string;
}> = ({ alertIds, eventId, scopeId }) => {
  const shouldUseFilters = alertIds && alertIds.length && alertIds.length >= dataProviderLimit;
  const dataProviders = useMemo(() => {
    if (alertIds && alertIds.length) {
      if (shouldUseFilters) {
        return null;
      } else {
        return alertIds.reduce<DataProvider[]>((result, alertId, index) => {
          const id = `${scopeId}-${eventId}-event.id-${index}-${alertId}`;
          result.push(getDataProvider('_id', id, alertId));
          return result;
        }, []);
      }
    }
    return null;
  }, [alertIds, shouldUseFilters, scopeId, eventId]);

  const filters: Filter[] | null = useMemo(() => {
    if (shouldUseFilters) {
      return [
        {
          meta: {
            alias: PROCESS_ANCESTRY_FILTER,
            type: 'phrases',
            key: '_id',
            params: [...alertIds],
            negate: false,
            disabled: false,
            value: alertIds.join(),
          },
          query: {
            bool: {
              should: alertIds.map((id) => {
                return {
                  match_phrase: {
                    _id: id,
                  },
                };
              }),
              minimum_should_match: 1,
            },
          },
        },
      ];
    } else {
      return null;
    }
  }, [alertIds, shouldUseFilters]);

  if (!dataProviders && !filters) {
    return null;
  }

  return (
    <>
      <SimpleAlertTable alertIds={alertIds} />
      <EuiSpacer />
      <InvestigateInTimelineButton
        asEmptyButton={false}
        dataProviders={dataProviders}
        filters={filters}
        data-test-subj="investigate-ancestry-in-timeline"
      >
        {ACTION_INVESTIGATE_IN_TIMELINE}
      </InvestigateInTimelineButton>
    </>
  );
};
ActualRelatedAlertsByProcessAncestry.displayName = 'ActualRelatedAlertsByProcessAncestry';
