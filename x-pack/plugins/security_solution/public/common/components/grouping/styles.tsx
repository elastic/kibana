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
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
`;

export const StatsContainer = styled.span`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  border-right: ${({ theme }) => theme.eui.euiBorderThin};
  margin-right: ${({ theme }) => theme.eui.euiSizeS};
  padding-right: ${({ theme }) => theme.eui.euiSizeM};
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
  .euiAccordion__childWrapper {
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
    border-radius: 5px;
  }
  .euiAccordion__triggerWrapper {
    border-bottom: ${({ theme }) => theme.eui.euiBorderThin};
    border-radius: 5px;
    min-height: 78px;
    padding-left: 10px;
    padding-right: 10px;
  }
  .groupingAccordionForm {
    border-top: ${({ theme }) => theme.eui.euiBorderThin};
    border-left: ${({ theme }) => theme.eui.euiBorderThin};
    border-right: ${({ theme }) => theme.eui.euiBorderThin};
    border-bottom: none;
    border-radius: 5px;
  }
  .groupingAccordionForm__button {
    text-decoration: none !important;
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
