/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCode } from '@elastic/eui';

/* eslint-disable no-duplicate-imports */

import { EuiBreadcrumbs } from '@elastic/eui';

import styled from 'styled-components';
import { EuiDescriptionList } from '@elastic/eui';

/**
 * Used by the nodeDetail view to show attributes of the related events.
 */
export const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 10em;
  }
`;

/**
 * Used by the nodeDetail view for the label of the node.
 */
export const StyledTitle = styled('h4')`
  overflow-wrap: break-word;
`;

/**
 * Used for a 'BETA' badge in the breadcrumbs of each panel.
 */
export const BetaHeader = styled(`header`)`
  margin-bottom: 1em;
`;

/**
 * Styled version of EuiBreadcrumbs that is used by the breadcrumbs in each panel.
 */
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

/**
 * Used in the links to nodes on the node list panel.
 */
export const StyledButtonTextContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
`;

/**
 * Used in the node list panel to call out the event that is represented by the databaseDocumentID.
 */
export const StyledAnalyzedEvent = styled.div`
  color: ${(props) => props.color};
  font-size: 10.5px;
  font-weight: 700;
`;

/**
 * Used to style the node name in the node list panel view.
 */
export const StyledLabelTitle = styled.div``;

/**
 * Used by the node list view. Wraps the title of the node and the 'Analyzed event' marker.
 */
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

/**
 * A bold version of EuiCode to display certain titles with
 */
export const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`;

/**
 * A component to keep time representations in blocks so they don't wrap
 * and look bad.
 */
export const StyledTime = styled('time')`
  display: inline-block;
  text-align: start;
`;
