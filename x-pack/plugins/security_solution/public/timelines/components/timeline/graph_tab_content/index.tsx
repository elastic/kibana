/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { timelineSelectors } from '../../../store/timeline';
import { useShallowEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineId } from '../../../../../common/types/timeline';
import { GraphOverlay } from '../../graph_overlay';
import { useSessionView } from '../session_tab_content/use_session_view';

interface GraphTabContentProps {
  timelineId: TimelineId;
}

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

const GraphTabContentComponent: React.FC<GraphTabContentProps> = ({ timelineId }) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const graphEventId = useShallowEqualSelector(
    (state) => getTimeline(state, timelineId)?.graphEventId
  );

  const { shouldShowDetailsPanel, DetailsPanel, Navigation, SessionView } = useSessionView({
    timelineId,
  });

  if (!graphEventId) {
    return null;
  }

  return (
    <>
      <GraphOverlay timelineId={timelineId} Navigation={Navigation} SessionView={SessionView} />
      {shouldShowDetailsPanel && (
        <>
          <VerticalRule />
          <ScrollableFlexItem grow={1}>{DetailsPanel}</ScrollableFlexItem>
        </>
      )}
    </>
  );
};

GraphTabContentComponent.displayName = 'GraphTabContentComponent';

const GraphTabContent = React.memo(GraphTabContentComponent);

// eslint-disable-next-line import/no-default-export
export { GraphTabContent as default };
