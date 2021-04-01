/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { FULL_SCREEN } from '../timeline/body/column_headers/translations';
import { EXIT_FULL_SCREEN } from '../../../common/components/exit_full_screen/translations';
import { FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../common/constants';
import {
  useGlobalFullScreen,
  useTimelineFullScreen,
} from '../../../common/containers/use_full_screen';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineId } from '../../../../common/types/timeline';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { isFullScreen } from '../timeline/body/column_headers';
import { sourcererSelectors } from '../../../common/store';
import { updateTimelineGraphEventId } from '../../../timelines/store/timeline/actions';
import { Resolver } from '../../../resolver/view';
import {
  isLoadingSelector,
  startSelector,
  endSelector,
} from '../../../common/components/super_date_picker/selectors';
import * as i18n from './translations';

const OverlayContainer = styled.div`
  ${({ $restrictWidth }: { $restrictWidth: boolean }) =>
    `
    display: flex;
    flex-direction: column;
    flex: 1;
    width: ${$restrictWidth ? 'calc(100% - 36px)' : '100%'};
    `}
`;

const StyledResolver = styled(Resolver)`
  height: 100%;
`;

const FullScreenButtonIcon = styled(EuiButtonIcon)`
  margin: 4px 0 4px 0;
`;

interface OwnProps {
  isEventViewer: boolean;
  timelineId: TimelineId;
}

interface NavigationProps {
  fullScreen: boolean;
  globalFullScreen: boolean;
  onCloseOverlay: () => void;
  timelineId: TimelineId;
  timelineFullScreen: boolean;
  toggleFullScreen: () => void;
}

const NavigationComponent: React.FC<NavigationProps> = ({
  fullScreen,
  globalFullScreen,
  onCloseOverlay,
  timelineId,
  timelineFullScreen,
  toggleFullScreen,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty iconType="cross" onClick={onCloseOverlay} size="xs">
        {i18n.CLOSE_ANALYZER}
      </EuiButtonEmpty>
    </EuiFlexItem>
    {timelineId !== TimelineId.active && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={fullScreen ? EXIT_FULL_SCREEN : FULL_SCREEN}>
          <FullScreenButtonIcon
            aria-label={
              isFullScreen({ globalFullScreen, timelineId, timelineFullScreen })
                ? EXIT_FULL_SCREEN
                : FULL_SCREEN
            }
            className={fullScreen ? FULL_SCREEN_TOGGLED_CLASS_NAME : ''}
            color={fullScreen ? 'ghost' : 'primary'}
            data-test-subj="full-screen"
            iconType="fullScreen"
            onClick={toggleFullScreen}
          />
        </EuiToolTip>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

NavigationComponent.displayName = 'NavigationComponent';

const Navigation = React.memo(NavigationComponent);

const GraphOverlayComponent: React.FC<OwnProps> = ({ isEventViewer, timelineId }) => {
  const dispatch = useDispatch();
  const onCloseOverlay = useCallback(() => {
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
  }, [dispatch, timelineId]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).graphEventId
  );

  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const { timelineFullScreen, setTimelineFullScreen } = useTimelineFullScreen();
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

  const toggleFullScreen = useCallback(() => {
    if (timelineId === TimelineId.active) {
      setTimelineFullScreen(!timelineFullScreen);
    } else {
      setGlobalFullScreen(!globalFullScreen);
    }
  }, [
    timelineId,
    setTimelineFullScreen,
    timelineFullScreen,
    setGlobalFullScreen,
    globalFullScreen,
  ]);

  const existingIndexNamesSelector = useMemo(
    () => sourcererSelectors.getAllExistingIndexNamesSelector(),
    []
  );
  const existingIndexNames = useDeepEqualSelector<string[]>(existingIndexNamesSelector);

  return (
    <OverlayContainer
      data-test-subj="overlayContainer"
      $restrictWidth={isEventViewer && fullScreen}
    >
      <EuiHorizontalRule margin="none" />
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <Navigation
            fullScreen={fullScreen}
            globalFullScreen={globalFullScreen}
            onCloseOverlay={onCloseOverlay}
            timelineId={timelineId}
            timelineFullScreen={timelineFullScreen}
            toggleFullScreen={toggleFullScreen}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="none" />
      {graphEventId !== undefined ? (
        <StyledResolver
          databaseDocumentID={graphEventId}
          resolverComponentInstanceID={timelineId}
          indices={existingIndexNames}
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
};

export const GraphOverlay = React.memo(GraphOverlayComponent);
