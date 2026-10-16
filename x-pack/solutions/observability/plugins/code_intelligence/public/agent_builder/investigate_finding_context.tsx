/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import React, { createContext, useCallback, useContext } from 'react';

import type { FindingItem } from '../api';
import type { AgentBuilderStager } from './agent_builder_stager';
import { investigateFinding } from './investigate_finding_attachment';
import { useAgentBuilderAccess } from './use_agent_builder_access';

export type InvestigateFinding = (finding: FindingItem) => void;

/** Absent when Agent Builder is off or the user cannot chat. */
export const InvestigateFindingContext = createContext<InvestigateFinding | undefined>(undefined);

/** Absent until the user can chat with Agent Builder. */
export const useInvestigateFinding = ({
  agentBuilder,
  stager,
  toasts,
}: {
  agentBuilder: Pick<AgentBuilderPluginStart, 'getAgentBuilderAccess'> | undefined;
  stager: Pick<AgentBuilderStager, 'addQuery'> | undefined;
  toasts: Pick<ToastsStart, 'addSuccess'>;
}): InvestigateFinding | undefined => {
  const canChat = useAgentBuilderAccess(agentBuilder);

  const investigate = useCallback(
    (finding: FindingItem) => {
      if (stager !== undefined) investigateFinding({ stager, toasts }, finding);
    },
    [stager, toasts]
  );

  return canChat && stager !== undefined ? investigate : undefined;
};

const investigateLabel = i18n.translate(
  'xpack.codeIntelligence.agentBuilder.investigateFindingAriaLabel',
  { defaultMessage: 'Investigate with AI Agent' }
);

export const InvestigateFindingButtonIcon = ({ finding }: { finding: FindingItem }) => {
  const investigate = useContext(InvestigateFindingContext);
  if (investigate === undefined) return null;
  return (
    <EuiToolTip content={investigateLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        iconType="addToChat"
        aria-label={investigateLabel}
        size="xs"
        data-test-subj="codeIntelligenceFindingRowInvestigate"
        onClick={(event: React.MouseEvent) => {
          event.stopPropagation();
          investigate(finding);
        }}
      />
    </EuiToolTip>
  );
};

export const InvestigateFindingButton = ({ finding }: { finding: FindingItem }) => {
  const investigate = useContext(InvestigateFindingContext);
  if (investigate === undefined) return null;
  return (
    <EuiButton
      iconType="addToChat"
      size="s"
      data-test-subj="codeIntelligenceFindingFlyoutInvestigate"
      onClick={() => investigate(finding)}
    >
      {i18n.translate('xpack.codeIntelligence.agentBuilder.investigateFindingButton', {
        defaultMessage: 'Investigate with AI Agent',
      })}
    </EuiButton>
  );
};
