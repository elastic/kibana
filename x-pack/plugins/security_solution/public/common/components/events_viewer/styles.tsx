/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import styled from 'styled-components';
export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';
export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';

export const FullScreenContainer = styled.div<{ $isFullScreen: boolean }>`
  height: ${({ $isFullScreen }) => ($isFullScreen ? '100%' : undefined)};
  flex: 1 1 auto;
  display: flex;
  width: 100%;
`;

export const FullWidthFlexGroupTable = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

export const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

export const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible?: boolean }>`
  overflow: hidden;
  margin: 0;
  min-height: 490px;
  display: ${({ $visible = true }) => ($visible ? 'flex' : 'none')};
`;

export const UpdatedFlexGroup = styled(EuiFlexGroup)<{
  $hasRightOffset?: boolean;
}>`
  ${({ $hasRightOffset, theme }) =>
    $hasRightOffset
      ? `margin-right: ${theme.eui.euiSizeXL};`
      : `margin-right: ${theme.eui.euiSizeL};`}
  position: absolute;
  z-index: ${({ theme }) => theme.eui.euiZLevel1 - 3};
  ${({ $hasRightOffset, theme }) =>
    $hasRightOffset ? `right: ${theme.eui.euiSizeXL};` : `right: ${theme.eui.euiSizeL};`}
`;

export const UpdatedFlexItem = styled(EuiFlexItem)<{ $show: boolean }>`
  ${({ $show }) => ($show ? '' : 'visibility: hidden;')}
`;

export const EventsContainerLoading = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`,
}))`
  position: relative;
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

export const StyledEuiPanel = styled(EuiPanel)<{ $isFullScreen: boolean }>`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;

  ${({ $isFullScreen }) =>
    $isFullScreen &&
    `
    border: 0;
    box-shadow: none;
    padding-top: 0;
    padding-bottom: 0;
`}
`;
