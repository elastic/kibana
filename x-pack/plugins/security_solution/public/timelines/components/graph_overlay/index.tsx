/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useDispatch } from 'react-redux';
import styled, { css } from 'styled-components';
import { InputsModelId } from '../../../common/store/inputs/constants';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineSelectors, timelineActions } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { isFullScreen } from '../timeline/body/column_headers';
import { inputsActions } from '../../../common/store/actions';
import { Resolver } from '../../../resolver/view';
import { useTimelineDataFilters } from '../../containers/use_timeline_data_filters';

const SESSION_VIEW_FULL_SCREEN = 'sessionViewFullScreen';

const OverlayStyle = css`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
`;

const OverlayContainer = styled.div`
  ${OverlayStyle}
`;

const FullScreenOverlayStyles = css`
  position: fixed;
  top: 0;
  bottom: 2em;
  left: 0;
  right: 0;
  z-index: ${euiThemeVars.euiZLevel3};
`;

const FullScreenOverlayContainer = styled.div`
  ${FullScreenOverlayStyles}
`;

const StyledResolver = styled(Resolver)`
  height: 100%;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `background-color: ${theme.eui.euiColorEmptyShade};`}
  overflow: hidden;
  width: 100%;
  &.${SESSION_VIEW_FULL_SCREEN} {
    ${({ theme }) => `padding: 0 ${theme.eui.euiSizeM}`}
  }
`;

interface GraphOverlayProps {
  timelineId: TimelineId;
  SessionView: JSX.Element | null;
  Navigation: JSX.Element | null;
}

const GraphOverlayComponent: React.FC<GraphOverlayProps> = ({
  timelineId,
  SessionView,
  Navigation,
}) => {
  const dispatch = useDispatch();
  const { globalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen } = useTimelineFullScreen();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { graphEventId, sessionViewConfig } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  const fullScreen = useMemo(
    () => isFullScreen({ globalFullScreen, timelineId, timelineFullScreen }),
    [globalFullScreen, timelineId, timelineFullScreen]
  );

  const isInTimeline = timelineId === TimelineId.active;

  useEffect(() => {
    return () => {
      dispatch(timelineActions.updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
      if (timelineId === TimelineId.active) {
        dispatch(inputsActions.setFullScreen({ id: InputsModelId.timeline, fullScreen: false }));
      } else {
        dispatch(inputsActions.setFullScreen({ id: InputsModelId.global, fullScreen: false }));
      }
    };
  }, [dispatch, timelineId]);

  const { from, to, shouldUpdate, selectedPatterns } = useTimelineDataFilters(timelineId);

  const sessionContainerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (fullScreen && sessionContainerRef.current) {
      sessionContainerRef.current.setAttribute('style', FullScreenOverlayStyles.join(''));
    } else if (sessionContainerRef.current) {
      sessionContainerRef.current.setAttribute('style', OverlayStyle.join(''));
    }
  }, [fullScreen]);

  if (!isInTimeline && sessionViewConfig !== null) {
    return (
      <OverlayContainer data-test-subj="overlayContainer" ref={sessionContainerRef}>
        <EuiFlexGroup alignItems="flexStart" gutterSize="none" direction="column">
          <EuiHorizontalRule margin="none" />
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          <ScrollableFlexItem grow={2} className={fullScreen ? SESSION_VIEW_FULL_SCREEN : ''}>
            {SessionView}
          </ScrollableFlexItem>
        </EuiFlexGroup>
      </OverlayContainer>
    );
  } else if (fullScreen && !isInTimeline) {
    return (
      <FullScreenOverlayContainer data-test-subj="overlayContainer">
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        {graphEventId !== undefined ? (
          <StyledResolver
            databaseDocumentID={graphEventId}
            resolverComponentInstanceID={timelineId}
            indices={selectedPatterns}
            shouldUpdate={shouldUpdate}
            filters={{ from, to }}
          />
        ) : (
          <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexGroup>
        )}
      </FullScreenOverlayContainer>
    );
  } else {
    return (
      <OverlayContainer data-test-subj="overlayContainer">
        <EuiHorizontalRule margin="none" />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        {graphEventId !== undefined ? (
          <StyledResolver
            databaseDocumentID={graphEventId}
            resolverComponentInstanceID={timelineId}
            indices={selectedPatterns}
            shouldUpdate={shouldUpdate}
            filters={{ from, to }}
          />
        ) : (
          <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexGroup>
        )}
      </OverlayContainer>
    );
  }
};

export const GraphOverlay = React.memo(GraphOverlayComponent);
