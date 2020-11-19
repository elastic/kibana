/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiSpacer, EuiTitle, EuiProgress } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { TimelineQueryTabContent } from './query_tab_content';
import { FlyoutHeader, FlyoutHeaderPanel } from '../flyout/header';
import { NotesTabContent } from '../notes';
import { TimelineType } from '../../../../common/types/timeline';
import * as i18n from './translations';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { activeTimeline } from '../../containers/active_timeline_context';

const TimelineContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TimelineTemplateBadge = styled.div`
  background: ${({ theme }) => theme.eui.euiColorVis3_behindText};
  color: #fff;
  padding: 10px 15px;
  font-size: 0.8em;
`;

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }
`;

export interface Props {
  timelineId: string;
}

const StatefulTimelineComponent: React.FC<Props> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const dispatch = useDispatch();
  const { selectedPatterns } = useSourcererScope(SourcererScopeName.timeline);
  const { status, noteIds, isSaving, savedObjectId, timelineType } = useDeepEqualSelector(
    (state) => getTimeline(state, timelineId) ?? timelineDefaults
  );

  useEffect(() => {
    if (!savedObjectId) {
      dispatch(
        timelineActions.createTimeline({
          id: timelineId,
          columns: defaultHeaders,
          indexNames: selectedPatterns,
          expandedEvent: activeTimeline.getExpandedEvent(),
          show: false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = useMemo(
    () => [
      {
        id: 'query',
        name: 'Query',
        content: <TimelineQueryTabContent timelineId={timelineId} />,
      },
      {
        id: 'notes',
        name: 'Notes',
        content: (
          <>
            <EuiSpacer />
            <EuiTitle>
              <h3>{'Notes'}</h3>
            </EuiTitle>
            <NotesTabContent timelineStatus={status} timelineId={timelineId} noteIds={noteIds} />
          </>
        ),
      },
      {
        id: 'pinned',
        name: 'Pinned',
        disabled: true,
        content: <></>,
      },
    ],
    [noteIds, status, timelineId]
  );

  return (
    <TimelineContainer data-test-subj="timeline">
      {isSaving && <EuiProgress size="s" color="primary" position="absolute" />}
      {timelineType === TimelineType.template && (
        <TimelineTemplateBadge>{i18n.TIMELINE_TEMPLATE}</TimelineTemplateBadge>
      )}

      <FlyoutHeaderPanel timelineId={timelineId} />
      <FlyoutHeader timelineId={timelineId} />

      <StyledEuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </TimelineContainer>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
