/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTabbedContent, EuiProgress, EuiTabs, EuiTab } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';

import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';
import { defaultHeaders } from './body/column_headers/default_headers';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { FlyoutHeader, FlyoutHeaderPanel } from '../flyout/header';
import { TimelineType } from '../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { activeTimeline } from '../../containers/active_timeline_context';
import { QueryTabContent } from './query_tab_content';
import { GraphTabContent } from './graph_tab_content';
import { NotesTabContent } from './notes_tab_content';
import * as i18n from './translations';

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

const StyledDiv = styled.div.attrs(({ $isVisible = false }: { $isVisible: boolean }) => ({
  style: {
    display: $isVisible ? 'flex' : 'none',
  },
}))`
  flex: 1;
  overflow: hidden;
`;

export interface Props {
  timelineId: string;
}

const StatefulTimelineComponent: React.FC<Props> = ({ timelineId }) => {
  const getTimeline = timelineSelectors.getTimelineByIdSelector();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('query');
  const { selectedPatterns } = useSourcererScope(SourcererScopeName.timeline);
  const { graphEventId, isSaving, savedObjectId, timelineType } = useDeepEqualSelector(
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

  return (
    <TimelineContainer data-test-subj="timeline">
      {isSaving && <EuiProgress size="s" color="primary" position="absolute" />}
      {timelineType === TimelineType.template && (
        <TimelineTemplateBadge>{i18n.TIMELINE_TEMPLATE}</TimelineTemplateBadge>
      )}

      <FlyoutHeaderPanel timelineId={timelineId} />
      <FlyoutHeader timelineId={timelineId} />

      <div>
        <EuiTabs>
          <EuiTab
            onClick={() => setActiveTab('query')}
            isSelected={'query' === activeTab}
            disabled={false}
            key={'query'}
          >
            {'Query'}
          </EuiTab>
          <EuiTab
            onClick={() => setActiveTab('graph')}
            isSelected={'graph' === activeTab}
            disabled={!graphEventId}
            key={'graph'}
          >
            {'Graph'}
          </EuiTab>
          <EuiTab
            onClick={() => setActiveTab('notes')}
            isSelected={'notes' === activeTab}
            disabled={false}
            key={'notes'}
          >
            {'Notes'}
          </EuiTab>
          <EuiTab
            onClick={() => setActiveTab('pinned')}
            isSelected={'pinned' === activeTab}
            disabled={true}
            key={'pinned'}
          >
            {'Pinned'}
          </EuiTab>
        </EuiTabs>
      </div>

      <StyledDiv $isVisible={'query' === activeTab}>
        <QueryTabContent timelineId={timelineId} />
      </StyledDiv>
      <StyledDiv $isVisible={'graph' === activeTab}>
        <GraphTabContent timelineId={timelineId} />
      </StyledDiv>
      <StyledDiv $isVisible={'notes' === activeTab}>
        <NotesTabContent timelineId={timelineId} />
      </StyledDiv>
    </TimelineContainer>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
