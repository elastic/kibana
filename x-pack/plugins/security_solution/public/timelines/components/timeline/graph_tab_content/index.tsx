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
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { GraphOverlay } from '../../graph_overlay';
import { useDetailPanel } from '../../side_panel/hooks/use_detail_panel';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

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

  const { openDetailsPanel, shouldShowDetailsPanel, DetailsPanel } = useDetailPanel({
    isFlyoutView: true,
    sourcererScope: SourcererScopeName.timeline,
    timelineId,
    tabType: TimelineTabs.query,
  });

  if (!graphEventId) {
    return null;
  }

  return (
    <>
      <GraphOverlay timelineId={timelineId} openDetailsPanel={openDetailsPanel} />
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
