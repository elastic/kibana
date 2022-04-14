/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { useDispatch } from 'react-redux';
import styled, { css } from 'styled-components';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { isFullScreen } from '../timeline/body/column_headers';
import { inputsActions } from '../../../common/store/actions';
import { Resolver } from '../../../resolver/view';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../../../common/components/super_date_picker/selectors';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { sourcererSelectors } from '../../../common/store';

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
  bottom: 0;
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
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
  width: 100%;
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
  const graphEventId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).graphEventId
  );
  const sessionViewConfig = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewConfig
  );

  const getStartSelector = useMemo(() => startSelector(), []);
  const getEndSelector = useMemo(() => endSelector(), []);
  const getIsLoadingSelector = useMemo(() => isLoadingSelector(), []);
  const isActive = useMemo(() => timelineId === TimelineId.active, [timelineId]);
  const shouldUpdate = useDeepEqualSelector((state) => {
    if (isActive) {
      return getIsLoadingSelector(state.inputs.timeline);
    } else {
      return getIsLoadingSelector(state.inputs.global);
    }
  });
  const from = useDeepEqualSelector((state) => {
    if (isActive) {
      return getStartSelector(state.inputs.timeline);
    } else {
      return getStartSelector(state.inputs.global);
    }
  });
  const to = useDeepEqualSelector((state) => {
    if (isActive) {
      return getEndSelector(state.inputs.timeline);
    } else {
      return getEndSelector(state.inputs.global);
    }
  });

  const fullScreen = useMemo(
    () => isFullScreen({ globalFullScreen, timelineId, timelineFullScreen }),
    [globalFullScreen, timelineId, timelineFullScreen]
  );

  const isInTimeline = timelineId === TimelineId.active;

  useEffect(() => {
    return () => {
      if (timelineId === TimelineId.active) {
        dispatch(inputsActions.setFullScreen({ id: 'timeline', fullScreen: false }));
      } else {
        dispatch(inputsActions.setFullScreen({ id: 'global', fullScreen: false }));
      }
    };
  }, [dispatch, timelineId]);

  const getDefaultDataViewSelector = useMemo(
    () => sourcererSelectors.defaultDataViewSelector(),
    []
  );
  const defaultDataView = useDeepEqualSelector(getDefaultDataViewSelector);

  const { selectedPatterns: timelinePatterns } = useSourcererDataView(SourcererScopeName.timeline);

  const selectedPatterns = useMemo(
    () => (isInTimeline ? timelinePatterns : defaultDataView.patternList),
    [defaultDataView.patternList, isInTimeline, timelinePatterns]
  );

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
          <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
          <ScrollableFlexItem grow={2}>{SessionView}</ScrollableFlexItem>
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
