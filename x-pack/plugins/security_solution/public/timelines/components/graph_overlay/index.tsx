/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiToolTip,
} from '@elastic/eui';
// Prefer  importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { noop } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import { connect, ConnectedProps, useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { FULL_SCREEN } from '../timeline/body/column_headers/translations';
import { EXIT_FULL_SCREEN } from '../../../common/components/exit_full_screen/translations';
import { DEFAULT_INDEX_KEY, FULL_SCREEN_TOGGLED_CLASS_NAME } from '../../../../common/constants';
import { useFullScreen } from '../../../common/containers/use_full_screen';
import { State } from '../../../common/store';
import { TimelineId, TimelineType } from '../../../../common/types/timeline';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { TimelineModel } from '../../store/timeline/model';
import { isFullScreen } from '../timeline/body/column_headers';
import { NewCase, ExistingCase } from '../timeline/properties/helpers';
import { updateTimelineGraphEventId } from '../../../timelines/store/timeline/actions';
import { Resolver } from '../../../resolver/view';
import { useAllCasesModal } from '../../../cases/components/use_all_cases_modal';

import * as i18n from './translations';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';

const OverlayContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const StyledResolver = styled(Resolver)`
  height: 100%;
`;

const FullScreenButtonIcon = styled(EuiButtonIcon)`
  margin: 4px 0 4px 0;
`;

interface OwnProps {
  graphEventId?: string;
  timelineId: string;
  timelineType: TimelineType;
}

const Navigation = ({
  fullScreen,
  globalFullScreen,
  onCloseOverlay,
  timelineId,
  timelineFullScreen,
  toggleFullScreen,
}: {
  fullScreen: boolean;
  globalFullScreen: boolean;
  onCloseOverlay: () => void;
  timelineId: string;
  timelineFullScreen: boolean;
  toggleFullScreen: () => void;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="none">
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty onClick={onCloseOverlay} size="xs">
        {i18n.BACK_TO_EVENTS}
      </EuiButtonEmpty>
    </EuiFlexItem>
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
  </EuiFlexGroup>
);

const GraphOverlayComponent = ({
  graphEventId,
  status,
  timelineId,
  title,
  timelineType,
}: OwnProps & PropsFromRedux) => {
  const dispatch = useDispatch();
  const onCloseOverlay = useCallback(() => {
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
  }, [dispatch, timelineId]);

  const currentTimeline = useSelector((state: State) =>
    timelineSelectors.selectTimeline(state, timelineId)
  );

  const { Modal: AllCasesModal, onOpenModal: onOpenCaseModal } = useAllCasesModal({ timelineId });

  const {
    timelineFullScreen,
    setTimelineFullScreen,
    globalFullScreen,
    setGlobalFullScreen,
  } = useFullScreen();
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

  const { signalIndexName } = useSignalIndex();
  const [siemDefaultIndices] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const indices: string[] | null = useMemo(() => {
    if (signalIndexName === null) {
      return null;
    } else {
      return [...siemDefaultIndices, signalIndexName];
    }
  }, [signalIndexName, siemDefaultIndices]);

  return (
    <OverlayContainer>
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
        {timelineId === TimelineId.active && timelineType === TimelineType.default && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <NewCase
                  compact={true}
                  graphEventId={graphEventId}
                  onClosePopover={noop}
                  timelineId={timelineId}
                  timelineTitle={title}
                  timelineStatus={status}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ExistingCase
                  compact={true}
                  onClosePopover={noop}
                  onOpenCaseModal={onOpenCaseModal}
                  timelineStatus={status}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />
      {graphEventId !== undefined && indices !== null && (
        <StyledResolver
          databaseDocumentID={graphEventId}
          resolverComponentInstanceID={currentTimeline.id}
          indices={indices}
        />
      )}
      <AllCasesModal />
    </OverlayContainer>
  );
};

const makeMapStateToProps = () => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: OwnProps) => {
    const timeline: TimelineModel = getTimeline(state, timelineId) ?? timelineDefaults;
    const { status, title = '' } = timeline;

    return {
      status,
      title,
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const GraphOverlay = connector(GraphOverlayComponent);
