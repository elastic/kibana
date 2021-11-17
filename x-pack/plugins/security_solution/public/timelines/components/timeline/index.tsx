/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { EuiProgress } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { isTab, TimelineContext } from '../../../../../timelines/public';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import { CellValueElementProps } from './cell_rendering';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { FlyoutHeader, FlyoutHeaderPanel } from '../flyout/header';
import { TimelineType, TimelineId, RowRenderer } from '../../../../common/types/timeline';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
import { activeTimeline } from '../../containers/active_timeline_context';
import { EVENTS_COUNT_BUTTON_CLASS_NAME, onTimelineTabKeyPressed } from './helpers';
import * as i18n from './translations';
import { TabsContent } from './tabs_content';
import { HideShowContainer, TimelineContainer } from './styles';
import { useTimelineFullScreen } from '../../../common/containers/use_full_screen';
import { EXIT_FULL_SCREEN_CLASS_NAME } from '../../../common/components/exit_full_screen';
import { useResolveConflict } from '../../../common/hooks/use_resolve_conflict';

const TimelineTemplateBadge = styled.div`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  color: #fff;
  padding: 10px 15px;
  font-size: 0.8em;
`;

export interface Props {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: TimelineId;
}

const TimelineSavingProgressComponent: React.FC<{ timelineId: TimelineId }> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const isSaving = useShallowEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).isSaving
  );

  return isSaving ? <EuiProgress size="s" color="primary" position="absolute" /> : null;
};

const TimelineSavingProgress = React.memo(TimelineSavingProgressComponent);

const StatefulTimelineComponent: React.FC<Props> = ({
  renderCellValue,
  rowRenderers,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { dataViewId, selectedPatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const {
    dataViewId: dataViewIdCurrent,
    indexNames: selectedPatternsCurrent,
    graphEventId,
    savedObjectId,
    timelineType,
    description,
  } = useDeepEqualSelector((state) =>
    pick(
      ['indexNames', 'dataViewId', 'graphEventId', 'savedObjectId', 'timelineType', 'description'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );
  const { timelineFullScreen } = useTimelineFullScreen();

  useEffect(() => {
    if (!savedObjectId) {
      dispatch(
        timelineActions.createTimeline({
          id: timelineId,
          columns: defaultHeaders,
          dataViewId,
          indexNames: selectedPatterns,
          expandedDetail: activeTimeline.getExpandedDetail(),
          show: false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDataViewChange = useCallback(() => {
    if (
      dataViewIdCurrent === '' ||
      (dataViewIdCurrent === dataViewId &&
        selectedPatternsCurrent.sort().join() === selectedPatterns.sort().join())
    ) {
      return;
    }

    dispatch(
      timelineActions.updateDataView({
        id: timelineId,
        dataViewId,
        indexNames: selectedPatterns,
      })
    );
  }, [
    dataViewId,
    dataViewIdCurrent,
    dispatch,
    selectedPatterns,
    selectedPatternsCurrent,
    timelineId,
  ]);

  useEffect(() => {
    onDataViewChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, selectedPatterns]);

  const onSkipFocusBeforeEventsTable = useCallback(() => {
    const exitFullScreenButton = containerElement.current?.querySelector<HTMLButtonElement>(
      EXIT_FULL_SCREEN_CLASS_NAME
    );

    if (exitFullScreenButton != null) {
      exitFullScreenButton.focus();
    } else {
      containerElement.current
        ?.querySelector<HTMLButtonElement>('.globalFilterBar__addButton')
        ?.focus();
    }
  }, [containerElement]);

  const onSkipFocusAfterEventsTable = useCallback(() => {
    containerElement.current
      ?.querySelector<HTMLButtonElement>(`.${EVENTS_COUNT_BUTTON_CLASS_NAME}`)
      ?.focus();
  }, [containerElement]);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isTab(keyboardEvent)) {
        onTimelineTabKeyPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          onSkipFocusBeforeEventsTable,
          onSkipFocusAfterEventsTable,
        });
      }
    },
    [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
  );
  const timelineContext = useMemo(() => ({ timelineId }), [timelineId]);
  const resolveConflictComponent = useResolveConflict();

  return (
    <TimelineContext.Provider value={timelineContext}>
      <TimelineContainer
        data-test-subj="timeline"
        data-timeline-id={timelineId}
        onKeyDown={onKeyDown}
        ref={containerElement}
      >
        <TimelineSavingProgress timelineId={timelineId} />
        {timelineType === TimelineType.template && (
          <TimelineTemplateBadge>{i18n.TIMELINE_TEMPLATE}</TimelineTemplateBadge>
        )}
        {resolveConflictComponent}
        <HideShowContainer
          $isVisible={!timelineFullScreen}
          data-test-subj="timeline-hide-show-container"
        >
          <FlyoutHeaderPanel timelineId={timelineId} />
          <FlyoutHeader timelineId={timelineId} />
        </HideShowContainer>

        <TabsContent
          graphEventId={graphEventId}
          renderCellValue={renderCellValue}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
          timelineType={timelineType}
          timelineDescription={description}
          timelineFullScreen={timelineFullScreen}
        />
      </TimelineContainer>
    </TimelineContext.Provider>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
