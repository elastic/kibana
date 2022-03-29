/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { timelineSelectors } from '../../../store/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useDetailPanel } from '../../side_panel/hooks/use_detail_panel';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { useTimelineFullScreen } from '../../../../common/containers/use_full_screen';
import {
  updateTimelineGraphEventId,
  updateTimelineSessionViewSessionId,
} from '../../../../timelines/store/timeline/actions';
import * as i18n from '../../graph_overlay/translations';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

interface Props {
  timelineId: TimelineId;
}

const SessionTabContent: React.FC<Props> = ({ timelineId }) => {
  const { sessionView } = useKibana().services;
  const dispatch = useDispatch();

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const sessionViewId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewId
  );
  const { setTimelineFullScreen } = useTimelineFullScreen();
  const onCloseOverlay = useCallback(() => {
    const isDataGridFullScreen = document.querySelector('.euiDataGrid--fullScreen') !== null;
    // Since EUI changes these values directly as a side effect, need to add them back on close.
    if (isDataGridFullScreen) {
      document.body.classList.add('euiDataGrid__restrictBody');
    } else {
      setTimelineFullScreen(false);
    }
    dispatch(updateTimelineGraphEventId({ id: timelineId, graphEventId: '' }));
    dispatch(updateTimelineSessionViewSessionId({ id: timelineId, eventId: null }));
  }, [dispatch, timelineId, setTimelineFullScreen]);
  const { openDetailsPanel, shouldShowDetailsPanel, DetailsPanel } = useDetailPanel({
    sourcererScope: SourcererScopeName.timeline,
    timelineId,
    tabType: TimelineTabs.session,
  });
  const sessionViewMain = useMemo(() => {
    return sessionViewId !== null
      ? sessionView.getSessionView({
          sessionEntityId: sessionViewId,
          loadAlertDetails: openDetailsPanel,
        })
      : null;
  }, [openDetailsPanel, sessionView, sessionViewId]);

  return (
    <FullWidthFlexGroup gutterSize="none">
      <EuiFlexGroup gutterSize="none" direction="column" justifyContent={'flexStart'}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onCloseOverlay} size="xs">
            {i18n.CLOSE_SESSION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <ScrollableFlexItem grow={2}>{sessionViewMain}</ScrollableFlexItem>
      </EuiFlexGroup>
      {shouldShowDetailsPanel && (
        <>
          <VerticalRule />
          <ScrollableFlexItem grow={1}>{DetailsPanel}</ScrollableFlexItem>
        </>
      )}
    </FullWidthFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default SessionTabContent;
