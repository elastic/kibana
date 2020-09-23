/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-imports */

import { EuiBreadcrumbs } from '@elastic/eui';

import styled from 'styled-components';
import { EuiDescriptionList } from '@elastic/eui';

export const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 10em;
  }
`;

export const StyledTitle = styled('h4')`
  overflow-wrap: break-word;
`;

export const BetaHeader = styled(`header`)`
  margin-bottom: 1em;
`;

export const ThemedBreadcrumbs = styled(EuiBreadcrumbs)<{ background: string; text: string }>`
  &.euiBreadcrumbs {
    background-color: ${(props) => props.background};
    color: ${(props) => props.text};
    padding: 1em;
    border-radius: 5px;
  }

  & .euiBreadcrumbSeparator {
    background: ${(props) => props.text};
  }
`;

export const StyledButtonTextContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

export const StyledAnalyzedEvent = styled.div`
  color: ${(props) => props.color};
  font-size: 10.5px;
  font-weight: 700;
`;

export const StyledLabelTitle = styled.div``;

export const StyledLabelContainer = styled.div`
  display: inline-block;
  flex: 3;
  min-width: 0;

  ${StyledAnalyzedEvent},
  ${StyledLabelTitle} {
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
