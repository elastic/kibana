/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import { EuiProgress } from '@elastic/eui';
import React, { useCallback, useMemo, useRef, createContext } from 'react';
import styled from 'styled-components';

import { isTab } from '@kbn/timelines-plugin/public';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import type { CellValueElementProps } from './cell_rendering';
import { FlyoutHeader, FlyoutHeaderPanel } from '../flyout/header';
import type { TimelineId, RowRenderer } from '../../../../common/types/timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { useDeepEqualSelector, useShallowEqualSelector } from '../../../common/hooks/use_selector';
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

export const TimelineContext = createContext<{ timelineId: string | null }>({ timelineId: null });
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
  const containerElement = useRef<HTMLDivElement | null>(null);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { graphEventId, timelineType, description, sessionViewConfig } = useDeepEqualSelector(
    (state) =>
      pick(
        ['graphEventId', 'timelineType', 'description', 'sessionViewConfig'],
        getTimeline(state, timelineId) ?? timelineDefaults
      )
  );

  const { timelineFullScreen } = useTimelineFullScreen();

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
          sessionViewConfig={sessionViewConfig}
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
