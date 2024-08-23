/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useCallback } from 'react';
import { EuiButton, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { useDispatch, useSelector } from 'react-redux';

import { useAssistantContext } from '@kbn/elastic-assistant';
import { sourcererSelectors } from '../../common/store';
import { sourcererActions } from '../../common/store/actions';
import { inputsActions } from '../../common/store/inputs';
import { InputsModelId } from '../../common/store/inputs/constants';
import type { TimeRange } from '../../common/store/inputs/model';
import { SourcererScopeName } from '../../sourcerer/store/model';
import { TimelineTabs, TimelineId } from '../../../common/types/timeline';
import {
  ACTION_CANNOT_INVESTIGATE_IN_TIMELINE,
  ACTION_INVESTIGATE_IN_TIMELINE,
} from '../../detections/components/alerts_table/translations';
import type { DataProvider } from '../../timelines/components/timeline/data_providers/data_provider';
import {
  applyKqlFilterQuery,
  setActiveTabTimeline,
  setFilters,
  showTimeline,
  updateDataView,
  updateEqlOptions,
} from '../../timelines/store/actions';
import { useDiscoverInTimelineContext } from '../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { useShowTimeline } from '../../common/utils/timeline/use_show_timeline';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useDiscoverState } from '../../timelines/components/timeline/tabs/esql/use_discover_state';

export interface SendToTimelineButtonProps {
  asEmptyButton: boolean;
  dataProviders: DataProvider[] | null;
  filters?: Filter[] | null;
  timeRange?: TimeRange;
  keepDataView?: boolean;
  isDisabled?: boolean;
}

export const SendToTimelineButton: FC<PropsWithChildren<SendToTimelineButtonProps>> = ({
  asEmptyButton,
  children,
  dataProviders,
  filters,
  timeRange,
  keepDataView,
  ...rest
}) => {
  const dispatch = useDispatch();
  const { showAssistantOverlay } = useAssistantContext();
  const [isTimelineBottomBarVisible] = useShowTimeline();
  const { discoverStateContainer, defaultDiscoverAppState } = useDiscoverInTimelineContext();
  const { dataViewId: timelineDataViewId } = useSourcererDataView(SourcererScopeName.timeline);
  const { setDiscoverAppState } = useDiscoverState();

  const isEsqlTabInTimelineDisabled = useIsExperimentalFeatureEnabled('timelineEsqlTabDisabled');

  const signalIndexName = useSelector(sourcererSelectors.signalIndexName);
  const defaultDataView = useSelector(sourcererSelectors.defaultDataView);

  const configureAndOpenTimeline = useCallback(async () => {
    // Hide the assistant overlay so timeline can be seen (noop if using assistant in timeline)
    showAssistantOverlay({ showOverlay: false });

    if (dataProviders || filters) {
      // If esql, don't reset filters or mess with dataview & time range
      if (dataProviders?.[0]?.queryType === 'esql' || dataProviders?.[0]?.queryType === 'sql') {
        if (discoverStateContainer.current) {
          discoverStateContainer.current?.appState.set({
            query: {
              esql: dataProviders[0].kqlQuery,
            },
          });

          await discoverStateContainer.current?.appState.replaceUrlState({
            query: {
              esql: dataProviders[0].kqlQuery,
            },
          });
        } else {
          setDiscoverAppState({
            ...defaultDiscoverAppState,
            query: {
              esql: dataProviders[0].kqlQuery,
            },
          });
        }

        dispatch(
          setActiveTabTimeline({
            id: TimelineId.active,
            activeTab: TimelineTabs.esql,
          })
        );
        dispatch(
          showTimeline({
            id: TimelineId.active,
            show: true,
          })
        );
        return;
      }

      if (dataProviders) {
        // Ensure Security Solution Default DataView is selected (so it's not just alerts)
        dispatch(
          updateDataView({
            id: TimelineId.active,
            dataViewId: 'security-solution-default',
            indexNames: ['logs-*'],
          })
        );

        // Added temporary queryType to dataproviders to support EQL/DSL
        switch (dataProviders[0].queryType) {
          case 'eql':
            // is EQL
            dispatch(
              updateEqlOptions({
                id: TimelineId.active,
                field: 'query',
                value: dataProviders[0].kqlQuery,
              })
            );
            dispatch(
              setActiveTabTimeline({
                id: TimelineId.active,
                activeTab: TimelineTabs.eql,
              })
            );
            dispatch(
              showTimeline({
                id: TimelineId.active,
                show: true,
              })
            );
            break;
          case 'kql':
            // is KQL
            dispatch(
              applyKqlFilterQuery({
                id: TimelineId.active,
                filterQuery: {
                  kuery: {
                    kind: 'kuery',
                    expression: dataProviders[0].kqlQuery,
                  },
                  serializedQuery: dataProviders[0].kqlQuery,
                },
              })
            );
            dispatch(
              setActiveTabTimeline({
                id: TimelineId.active,
                activeTab: TimelineTabs.query,
              })
            );
            dispatch(
              showTimeline({
                id: TimelineId.active,
                show: true,
              })
            );
            break;
          case 'dsl':
            const filter = {
              meta: {
                type: 'custom',
                disabled: false,
                negate: false,
                alias: dataProviders[0].name,
                key: 'query',
                value: dataProviders[0].kqlQuery,
                index: timelineDataViewId ?? undefined,
              },
              query: JSON.parse(dataProviders[0].kqlQuery),
            };
            dispatch(setFilters({ id: TimelineId.active, filters: [filter] }));
            dispatch(
              setActiveTabTimeline({
                id: TimelineId.active,
                activeTab: TimelineTabs.query,
              })
            );
            dispatch(
              showTimeline({
                id: TimelineId.active,
                show: true,
              })
            );
            break;
        }
      }

      // Use filters if more than a certain amount of ids for dom performance.
      if (filters) {
        dispatch(
          setFilters({
            id: TimelineId.active,
            filters,
          })
        );
      }
      // Only show detection alerts
      // (This is required so the timeline event count matches the prevalence count)
      if (!keepDataView) {
        dispatch(
          sourcererActions.setSelectedDataView({
            id: SourcererScopeName.timeline,
            selectedDataViewId: defaultDataView.id,
            selectedPatterns: [signalIndexName || ''],
          })
        );
      }
      // Unlock the time range from the global time range
      dispatch(inputsActions.removeLinkTo([InputsModelId.timeline, InputsModelId.global]));
    }
  }, [
    showAssistantOverlay,
    dataProviders,
    filters,
    keepDataView,
    dispatch,
    discoverStateContainer,
    timelineDataViewId,
    defaultDataView.id,
    signalIndexName,
    setDiscoverAppState,
    defaultDiscoverAppState,
  ]);

  // As we work around timeline visibility issues, we will disable the button if timeline isn't available
  const toolTipText = isTimelineBottomBarVisible
    ? ACTION_INVESTIGATE_IN_TIMELINE
    : ACTION_CANNOT_INVESTIGATE_IN_TIMELINE;
  const isDisabled = !isTimelineBottomBarVisible;

  if (
    (dataProviders?.[0]?.queryType === 'esql' || dataProviders?.[0]?.queryType === 'sql') &&
    isEsqlTabInTimelineDisabled
  ) {
    return null;
  }

  return asEmptyButton ? (
    <EuiButtonEmpty
      aria-label={toolTipText}
      onClick={configureAndOpenTimeline}
      isDisabled={isDisabled}
      color="text"
      flush="both"
      size="xs"
    >
      <EuiToolTip position="right" content={toolTipText}>
        <>{children}</>
      </EuiToolTip>
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      aria-label={toolTipText}
      isDisabled={isDisabled}
      onClick={configureAndOpenTimeline}
      {...rest}
    >
      <EuiToolTip position="right" content={toolTipText}>
        <>{children}</>
      </EuiToolTip>
    </EuiButton>
  );
};

SendToTimelineButton.displayName = 'SendToTimelineButton';
