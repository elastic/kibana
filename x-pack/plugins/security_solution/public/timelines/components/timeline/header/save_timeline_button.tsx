/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import type { State } from '../../../../common/store';

import { TimelineId } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { getTimelineSaveModalByIdSelector } from './selectors';
import { TimelineTitleAndDescription } from './title_and_description';
import * as i18n from './translations';

export interface OwnProps {
  initialFocus: 'title' | 'description';
  timelineId: string;
  toolTip?: string;
}

export type SaveTimelineComponentProps = OwnProps & SaveTimelineComponentReduxProps;

const SaveTimelineButtonComponent = React.memo<SaveTimelineComponentProps>((props) => {
  const { initialFocus, timelineId, toolTip, showCallOutUnauthorizedMsg, dispatch } = props;
  const getTimelineSaveModal = useMemo(() => getTimelineSaveModalByIdSelector(), []);
  const show = useDeepEqualSelector((state) => getTimelineSaveModal(state, timelineId));
  const [showSaveTimelineOverlay, setShowSaveTimelineOverlay] = useState<boolean>(false);

  const closeSaveTimeline = useCallback(() => {
    setShowSaveTimelineOverlay(false);
    if (show) {
      dispatch(
        timelineActions.toggleModalSaveTimeline({
          id: TimelineId.active,
          showModalSaveTimeline: false,
        })
      );
    }
  }, [dispatch, setShowSaveTimelineOverlay, show]);

  const openSaveTimeline = useCallback(() => {
    setShowSaveTimelineOverlay(true);
  }, [setShowSaveTimelineOverlay]);

  const finalizedTooltip = useMemo(
    () => (!showCallOutUnauthorizedMsg ? toolTip : i18n.CALL_OUT_UNAUTHORIZED_MSG),
    [toolTip, showCallOutUnauthorizedMsg]
  );

  const saveTimelineButtonIcon = useMemo(
    () => (
      <EuiButtonIcon
        aria-label={i18n.EDIT}
        isDisabled={showCallOutUnauthorizedMsg}
        onClick={openSaveTimeline}
        iconType="pencil"
        data-test-subj="save-timeline-button-icon"
      />
    ),
    [openSaveTimeline, showCallOutUnauthorizedMsg]
  );

  return (initialFocus === 'title' && show) || showSaveTimelineOverlay ? (
    <>
      {saveTimelineButtonIcon}
      <TimelineTitleAndDescription
        closeSaveTimeline={closeSaveTimeline}
        initialFocus={initialFocus}
        timelineId={timelineId}
        showWarning={initialFocus === 'title' && show}
      />
    </>
  ) : (
    <EuiToolTip content={finalizedTooltip} data-test-subj="save-timeline-btn-tooltip">
      {saveTimelineButtonIcon}
    </EuiToolTip>
  );
});

const mapStateToProps = (state: State, props: OwnProps) => {
  const getShowCallOutUnauthorizedMsg = timelineSelectors.getShowCallOutUnauthorizedMsg();
  return {
    showCallOutUnauthorizedMsg: getShowCallOutUnauthorizedMsg(state),
  };
};

const connector = connect(mapStateToProps);

type SaveTimelineComponentReduxProps = ConnectedProps<typeof connector>;

export const SaveTimelineButton = connector(SaveTimelineButtonComponent);

SaveTimelineButtonComponent.displayName = 'SaveTimelineButtonComponent';
SaveTimelineButton.displayName = 'SaveTimelineButton';
