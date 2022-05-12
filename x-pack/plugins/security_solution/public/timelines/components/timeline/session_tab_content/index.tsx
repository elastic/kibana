/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { TimelineId } from '../../../../../common/types/timeline';
import { useSessionViewNavigation, useSessionView } from './use_session_view';

const FlexItemWithMargin = styled(EuiFlexItem)`
  width: 100%;
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
`;

const MaxWidthPageFlexGroup = styled(EuiFlexGroup)`
  max-width: 100%;
  box-sizing: border-box;
`;

const VerticalRule = styled.div`
  width: 2px;
  height: 100%;
  background: ${({ theme }) => theme.eui.euiColorLightShade};
`;

const StyledFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  height: 100%;
  min-width: 320px;
`;

interface Props {
  timelineId: TimelineId;
}

const SessionTabContent: React.FC<Props> = ({ timelineId }) => {
  const [height, setHeight] = useState(0);
  const measuredRef = useCallback((node) => {
    if (node !== null) {
      setHeight(node.getBoundingClientRect().height);
    }
  }, []);
  const { Navigation } = useSessionViewNavigation({
    timelineId,
  });
  const { SessionView, shouldShowDetailsPanel, DetailsPanel } = useSessionView({
    timelineId,
    height,
  });

  return (
    <MaxWidthPageFlexGroup
      alignItems="flexStart"
      gutterSize="none"
      ref={measuredRef}
      data-test-subj="timeline-session-content"
    >
      <FlexItemWithMargin grow={false}>
        {Navigation}
        {SessionView}
      </FlexItemWithMargin>
      {shouldShowDetailsPanel && (
        <>
          <VerticalRule />
          <StyledFlexItem grow={1}>{DetailsPanel}</StyledFlexItem>
        </>
      )}
    </MaxWidthPageFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default SessionTabContent;
