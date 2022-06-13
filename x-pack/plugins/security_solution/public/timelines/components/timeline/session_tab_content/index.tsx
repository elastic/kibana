/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import { TimelineId } from '../../../../../common/types/timeline';
import { useSessionView } from './use_session_view';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
  width: 100%;
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
  const { SessionView, shouldShowDetailsPanel, DetailsPanel, Navigation } = useSessionView({
    timelineId,
  });

  return (
    <FullWidthFlexGroup gutterSize="none">
      <EuiFlexGroup alignItems="flexStart" gutterSize="none" direction="column">
        <EuiFlexItem grow={false}>{Navigation}</EuiFlexItem>
        <ScrollableFlexItem>{SessionView}</ScrollableFlexItem>
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
