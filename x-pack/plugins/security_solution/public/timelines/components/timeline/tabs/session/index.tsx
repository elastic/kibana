/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import type { TimelineId } from '../../../../../../common/types/timeline';
import { useSessionViewNavigation, useSessionView } from './use_session_view';

const MaxWidthFlexItem = styled(EuiFlexItem)`
  width: 100%;
`;
const SessionViewWrapper = styled.div`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
`;

const MaxWidthPageFlexGroup = styled(EuiFlexGroup)`
  max-width: 100%;
  box-sizing: border-box;
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
    scopeId: timelineId,
  });
  const { SessionView } = useSessionView({
    scopeId: timelineId,
    height,
  });

  return (
    <MaxWidthPageFlexGroup
      alignItems="flexStart"
      gutterSize="none"
      ref={measuredRef}
      data-test-subj="timeline-session-content"
    >
      <MaxWidthFlexItem grow={false}>
        <EuiHorizontalRule margin="none" />
        {Navigation}
        <EuiHorizontalRule margin="none" />
        <EuiSpacer size="m" />
        <SessionViewWrapper>{SessionView}</SessionViewWrapper>
      </MaxWidthFlexItem>
    </MaxWidthPageFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default SessionTabContent;
