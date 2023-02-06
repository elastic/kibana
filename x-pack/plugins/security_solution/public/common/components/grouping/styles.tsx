/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiContextMenu } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import styled from 'styled-components';

export const GroupsUnitCount = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: 16px;
  padding-right: 16px;
`;

export const StatsContainer = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: 16px;
  padding-right: 16px;
  .smallDot {
    width: 3px !important;
    display: inline-block;
  }
  .euiBadge__text {
    text-align: center;
    width: 100%;
  }
`;

export const GroupingStyledContainer = styled.div`
  .euiAccordion__childWrapper .euiAccordion__padding--m {
    margin-left: 8px;
    margin-right: 8px;
    border-left: ${({ theme }) => theme.eui.euiBorderThin};
    border-right: ${({ theme }) => theme.eui.euiBorderThin};
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
    border-radius: 0 0 6px 6px;
  }
  .euiAccordion__triggerWrapper {
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
    border-left: ${({ theme }) => theme.eui.euiBorderThin};
    border-right: ${({ theme }) => theme.eui.euiBorderThin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: 16px;
    padding-right: 16px;
  }
  .groupingAccordionForm {
    border-top: ${({ theme }) => theme.eui.euiBorderThin};
    border-bottom: none;
    border-radius: 6px;
    min-width: 1090px;
  }
  .groupingAccordionForm__button {
    text-decoration: none !important;
  }
  .groupingPanelRenderer {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: 32px;
  }
`;

export const StyledContextMenu = euiStyled(EuiContextMenu)`
  width: 250px;
  & .euiContextMenuItem__text {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .euiContextMenuItem {
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
  }
  .euiContextMenuItem:last-child {
    border: none;
  }
`;

export const StyledEuiButtonEmpty = euiStyled(EuiButtonEmpty)`
  font-weight: 'normal';

  .euiButtonEmpty__text {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
