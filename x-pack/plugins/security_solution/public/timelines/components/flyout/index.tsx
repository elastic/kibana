/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiFocusTrap } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { AppLeaveHandler } from '../../../../../../../src/core/public';
import { TimelineId, TimelineStatus, TimelineTabs } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { timelineActions } from '../../store/timeline';
import { FlyoutBottomBar } from './bottom_bar';
import { Pane } from './pane';
import { getTimelineShowStatusByIdSelector } from './selectors';

const Visible = styled.div<{ show?: boolean }>`
  visibility: ${({ show }) => (show ? 'visible' : 'hidden')};
`;

Visible.displayName = 'Visible';

interface OwnProps {
  timelineId: string;
  onAppLeave: (handler: AppLeaveHandler) => void;
}

const FlyoutComponent: React.FC<OwnProps> = ({ timelineId, onAppLeave }) => {
  const dispatch = useDispatch();
  const getTimelineShowStatus = useMemo(() => getTimelineShowStatusByIdSelector(), []);
  const { activeTab, show, status: timelineStatus, updated } = useDeepEqualSelector((state) =>
    getTimelineShowStatus(state, timelineId)
  );

  useEffect(() => {
    onAppLeave((actions, nextAppId) => {
      if (show) {
        dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: false }));
      }
      // Confirm when the user has made any changes to a timeline
      if (
        !(nextAppId ?? '').includes('securitySolution') &&
        timelineStatus === TimelineStatus.draft &&
        updated != null
      ) {
        const showSaveTimelineModal = () => {
          dispatch(timelineActions.showTimeline({ id: TimelineId.active, show: true }));
          dispatch(
            timelineActions.setActiveTabTimeline({
              id: TimelineId.active,
              activeTab: TimelineTabs.query,
            })
          );
          dispatch(
            timelineActions.toggleModalSaveTimeline({
              id: TimelineId.active,
              showModalSaveTimeline: true,
            })
          );
        };

        return actions.confirm(
          i18n.translate('xpack.securitySolution.timeline.unsavedWorkMessage', {
            defaultMessage: 'Leave Timeline with unsaved work?',
          }),
          i18n.translate('xpack.securitySolution.timeline.unsavedWorkTitle', {
            defaultMessage: 'Unsaved changes',
          }),
          showSaveTimelineModal
        );
      } else {
        return actions.default();
      }
    });
  }, [dispatch, onAppLeave, show, timelineStatus, updated]);
  return (
    <>
      <EuiFocusTrap disabled={!show}>
        <Visible show={show}>
          <Pane timelineId={timelineId} />
        </Visible>
      </EuiFocusTrap>
      <FlyoutBottomBar activeTab={activeTab} timelineId={timelineId} showDataproviders={!show} />
    </>
  );
};

FlyoutComponent.displayName = 'FlyoutComponent';

export const Flyout = React.memo(FlyoutComponent);

Flyout.displayName = 'Flyout';
