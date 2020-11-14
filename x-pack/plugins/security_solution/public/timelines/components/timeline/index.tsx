/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiSpacer, EuiTitle, EuiProgress } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import deepEqual from 'fast-deep-equal';
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

export interface OwnProps {
  timelineId: string;
  onClose: () => void;
  usersViewing: string[];
}

export type Props = OwnProps;

const StatefulTimelineComponent = React.memo<Props>(({ timelineId, onClose, usersViewing }) => {
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
          show: false,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
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
  ];

  return (
    <TimelineContainer data-test-subj="timeline">
      {isSaving && <EuiProgress size="s" color="primary" position="absolute" />}
      {timelineType === TimelineType.template && (
        <TimelineTemplateBadge>{i18n.TIMELINE_TEMPLATE}</TimelineTemplateBadge>
      )}

      <FlyoutHeaderPanel onClose={onClose} timelineId={timelineId} usersViewing={usersViewing} />
      <FlyoutHeader timelineId={timelineId} />

      <StyledEuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
    </TimelineContainer>
  );
});

export const StatefulTimeline = React.memo(
  StatefulTimelineComponent,
  (prevProps, nextProps) =>
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.onClose === nextProps.onClose &&
    deepEqual(prevProps.usersViewing, nextProps.usersViewing)
);
