/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import type { ViewSelection } from './event_rendered_view/selector';

export const SELECTOR_TIMELINE_GLOBAL_CONTAINER = 'securitySolutionTimeline__container';
export const EVENTS_TABLE_CLASS_NAME = 'siemEventsTable';

/* EVENTS BODY */

export const EventsTrSupplement = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__trSupplement ${className}` as string,
}))<{ className: string }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  padding-left: ${({ theme }) => theme.eui.euiSizeM};
  .euiAccordion + div {
    background-color: ${({ theme }) => theme.eui.euiColorEmptyShade};
    padding: 0 ${({ theme }) => theme.eui.euiSizeS};
    border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
    border-radius: ${({ theme }) => theme.eui.euiSizeXS};
  }
`;

/**
 * EVENTS LOADING
 */

export const EventsLoading = styled(EuiLoadingSpinner)`
  margin: 0 2px;
  vertical-align: middle;
`;

export const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible?: boolean }>`
  overflow: hidden;
  margin: 0;
  min-height: 490px;
  display: ${({ $visible = true }) => ($visible ? 'flex' : 'none')};
`;

export const UpdatedFlexGroup = styled(EuiFlexGroup)<{ $view?: ViewSelection }>`
  ${({ $view, theme }) => ($view === 'gridView' ? `margin-right: ${theme.eui.euiSizeXL};` : '')}
  position: absolute;
  z-index: ${({ theme }) => theme.eui.euiZLevel1 - 3};
  right: 0px;
`;

export const UpdatedFlexItem = styled(EuiFlexItem)<{ $show: boolean }>`
  ${({ $show }) => ($show ? '' : 'visibility: hidden;')}
`;

export const AlertCount = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
`;
