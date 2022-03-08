/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { timelineSelectors } from '../../../store/timeline';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';
import { timelineDefaults } from '../../../../timelines/store/timeline/defaults';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
`;

interface Props {
  timelineId: TimelineId;
}

const SessionTabContent: React.FC<Props> = ({ timelineId }) => {
  const { sessionView } = useKibana().services;

  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

  const sessionViewId = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).sessionViewId
  );
  const sessionViewMain = useMemo(() => {
    return sessionViewId !== null ? sessionView.getSessionView(sessionViewId) : null;
  }, [sessionView, sessionViewId]);

  return <ScrollableFlexItem grow={2}>{sessionViewMain}</ScrollableFlexItem>;
};

// eslint-disable-next-line import/no-default-export
export default SessionTabContent;
