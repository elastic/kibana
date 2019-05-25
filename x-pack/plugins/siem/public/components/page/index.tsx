/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiIcon, EuiPage } from '@elastic/eui';
import styled, { injectGlobal } from 'styled-components';
import { getOr } from 'lodash/fp';

// SIDE EFFECT: the following `injectGlobal` overrides default styling in angular code that was not theme-friendly
// eslint-disable-next-line no-unused-expressions
injectGlobal`
  div.app-wrapper {
    background-color: rgba(0,0,0,0);
  }

  div.application {
    background-color: rgba(0,0,0,0);
  }
`;

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  height: 100%;
  padding: 1rem;
  overflow: hidden;
  margin: 0px;
`;

export const PageContent = styled.div`
  flex: 1 1 auto;
  height: 100%;
  position: relative;
  overflow-y: hidden;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  margin-top: 62px;
`;

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

export const PageHeader = styled.div`
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
  display: flex;
  user-select: none;
  padding: 1rem 1rem 0rem 1rem;
  width: 100vw;
  position: fixed;
`;

export const FooterContainer = styled.div`
  bottom: 0;
  color: #666;
  left: 0;
  padding: 8px;
  position: fixed;
  text-align: left;
  user-select: none;
  width: 100%;
  background-color: #f5f7fa;
  padding: 16px;
  border-top: 1px solid #d3dae6;
`;

export const PaneScrollContainer = styled.div`
  height: 100%;
  overflow-y: scroll;
  > div:last-child {
    margin-bottom: 3rem;
  }
`;

export const Pane = styled.div`
  height: 100%;
  overflow: hidden;
  user-select: none;
`;

export const PaneHeader = styled.div`
  display: flex;
`;

export const Pane1FlexContent = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 100%;
`;

export const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
`;

export const MoreRowItems = styled(EuiIcon)`
  margin-left: 5px;
`;

export const OverviewWrapper = styled(EuiFlexGroup)`
  position: relative;
`;

export const LoadingOverlay = styled.div`
  background-color: ${props => getOr('#ffffff', 'theme.eui.euiColorLightShade', props)};
  margin: -4px 5px;
  height: 100%;
  opacity: 0.7;
  width: calc(100% - 10px);
  position: absolute;
  z-index: 3;
  border-radius: 5px;
`;
