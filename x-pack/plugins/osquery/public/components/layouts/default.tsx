/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

export const Container = styled.div`
  min-height: calc(
    100vh - ${(props) => parseFloat(props.theme.eui.euiHeaderHeightCompensation) * 2}px
  );
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  display: flex;
  flex-direction: column;
`;

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

export const Nav = styled.nav`
  background: ${(props) => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) =>
    `${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL} ${props.theme.eui.euiSize} ${props.theme.eui.euiSizeL}`};
  .euiTabs {
    padding-left: 3px;
    margin-left: -3px;
  }
`;
