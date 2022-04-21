/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { InstalledIntegrationPolicy } from '../use_get_agent_incoming_data';

import { ConfirmIncomingData } from '../confirm_incoming_data';

export const IncomingDataConfirmationStep = ({
  agentIds,
  installedPolicy,
  agentDataConfirmed,
  setAgentDataConfirmed,
}: {
  agentIds: string[];
  installedPolicy?: InstalledIntegrationPolicy;
  agentDataConfirmed: boolean;
  setAgentDataConfirmed: (v: boolean) => void;
}): EuiContainedStepProps => {
  return {
    title: !agentDataConfirmed
      ? i18n.translate('xpack.fleet.agentEnrollment.stepConfirmIncomingData', {
          defaultMessage: 'Confirm incoming data',
        })
      : i18n.translate('xpack.fleet.agentEnrollment.stepConfirmIncomingData.completed', {
          defaultMessage: 'Incoming data confirmed',
        }),
    children:
      agentIds.length > 0 ? (
        <ConfirmIncomingData
          agentIds={agentIds}
          installedPolicy={installedPolicy}
          agentDataConfirmed={agentDataConfirmed}
          setAgentDataConfirmed={setAgentDataConfirmed}
        />
      ) : null,
    status: agentIds.length > 0 ? (!agentDataConfirmed ? 'loading' : 'complete') : 'disabled',
  };
};
