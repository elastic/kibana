/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash/fp';
import { EuiProgress } from '@elastic/eui';
import React, { useEffect, useMemo } from 'react';
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
import * as i18n from './translations';
import { TabsContent } from './tabs_content';

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

export interface Props {
  timelineId: string;
}

const StatefulTimelineComponent: React.FC<Props> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { selectedPatterns } = useSourcererScope(SourcererScopeName.timeline);
  const { graphEventId, isSaving, savedObjectId, timelineType } = useDeepEqualSelector((state) =>
    pick(
      ['graphEventId', 'isSaving', 'savedObjectId', 'timelineType'],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
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

      <TabsContent graphEventId={graphEventId} timelineId={timelineId} />
    </TimelineContainer>
  );
};

StatefulTimelineComponent.displayName = 'StatefulTimelineComponent';

export const StatefulTimeline = React.memo(StatefulTimelineComponent);
