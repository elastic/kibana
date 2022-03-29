/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';
import { TimelineId } from '../../../../../common/types/timeline';
import * as i18n from '../../graph_overlay/translations';
import { useSessionView } from './use_session_view';

const FullWidthFlexGroup = styled(EuiFlexGroup)`
  margin: 0;
  width: 100%;
  overflow: hidden;
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  ${({ theme }) => `margin: 0 ${theme.eui.euiSizeM};`}
  overflow: hidden;
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
  const { SessionView, onCloseOverlay, shouldShowDetailsPanel, DetailsPanel } = useSessionView({
    timelineId,
  });

  return (
    <FullWidthFlexGroup gutterSize="none">
      <EuiFlexGroup gutterSize="none" direction="column" justifyContent={'flexStart'}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onCloseOverlay} size="xs">
            {i18n.CLOSE_SESSION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <ScrollableFlexItem grow={2}>{SessionView}</ScrollableFlexItem>
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
