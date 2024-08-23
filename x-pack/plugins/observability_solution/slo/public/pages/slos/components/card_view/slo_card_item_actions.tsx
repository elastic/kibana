/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import styled from 'styled-components';
import { useEuiShadow } from '@elastic/eui';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { BurnRateRuleParams } from '../../../../typings';
import { SloItemActions } from '../slo_item_actions';

type PopoverPosition = 'relative' | 'default';

interface ActionContainerProps {
  boxShadow: string;
  position: PopoverPosition;
}

const Container = styled.div<ActionContainerProps>`
  ${({ position }) =>
    position === 'relative'
      ? // custom styles used to overlay the popover button on `MetricItem`
        `
  display: inline-block;
  position: relative;
  bottom: 42px;
  left: 12px;
  z-index: 1;
`
      : // otherwise, no custom position needed
        ''}

  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  ${({ boxShadow, position }) => (position === 'relative' ? boxShadow : '')}
`;

interface Props {
  slo: SLOWithSummaryResponse;
  isActionsPopoverOpen: boolean;
  setIsActionsPopoverOpen: (value: boolean) => void;
  setDeleteConfirmationModalOpen: (value: boolean) => void;
  setResetConfirmationModalOpen: (value: boolean) => void;
  setIsAddRuleFlyoutOpen: (value: boolean) => void;
  setIsEditRuleFlyoutOpen: (value: boolean) => void;
  setDashboardAttachmentReady: (value: boolean) => void;
  rules?: Array<Rule<BurnRateRuleParams>>;
}

export function SloCardItemActions(props: Props) {
  const euiShadow = useEuiShadow('l');

  return (
    <Container boxShadow={euiShadow} position={'relative'}>
      <SloItemActions
        {...props}
        btnProps={{
          iconType: 'boxesHorizontal',
          color: 'primary',
          display: 'empty',
        }}
      />
    </Container>
  );
}
