/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEuiShadow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { BurnRateRuleParams } from '../../../../typings';
import { SloItemActions } from '../slo_item_actions';

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
  const borderRadius = useEuiTheme().euiTheme.border.radius.medium;

  return (
    <div
      css={css`
        display: inline-block;
        position: relative;
        bottom: 42px;
        left: 12px;
        z-index: 1;
        border-radius: ${borderRadius};
        ${useEuiShadow('l')}
      `}
    >
      <SloItemActions
        {...props}
        btnProps={{
          iconType: 'boxesHorizontal',
          color: 'primary',
          display: 'empty',
        }}
      />
    </div>
  );
}
