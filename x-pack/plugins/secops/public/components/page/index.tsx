/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPage } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
`;

export const FlexPage = styled(EuiPage)`
  flex: 1 0 0;
`;

export const PageHeader = styled.div`
  display: flex;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

export const FooterContainer = styled.div`
  position: relative;
  left: 0;
  bottom: 0;
  width: 100%;
  color: #666;
  padding: 8px 8px;
  text-align: left;
`;

export const SubHeader = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

export const SubHeaderDatePicker = styled.div`
  display: flex;
  justify-content: flex-end;
  margin: 5px 0 5px 0;
`;

export const PaneScrollContainer = styled.div`
  height: 100%;
  overflow-y: scroll;
`;

export const Pane1 = styled.div`
  height: 100%;
  overflow: hidden;
`;

/** For use with the `SplitPane` `pane1Style` prop */
export const Pane1Style: React.CSSProperties = {
  height: '100%',
  marginTop: '5px',
};

export const Pane1FlexContent = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  height: 100%;
`;

export const Pane1Header = styled.div`
  display: flex;
`;

export const Pane2 = styled.div`
  height: 100%;
  overflow-x: scroll;
  overflow-y: hidden;
`;

/** For use with the `SplitPane` `pane2Style` prop */
export const Pane2Style: React.CSSProperties = {
  height: '100%',
};

/** For use with the `SplitPane` `resizerStyle` prop */
export const ResizerStyle: React.CSSProperties = {
  border: '5px solid #909AA1',
  backgroundClip: 'padding-box',
  cursor: 'col-resize',
  margin: '5px',
  zIndex: 1,
};
