/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { sendPutSettings, useComboInput, useStartServices } from '../../../../hooks';
import { isDiffPathProtocol } from '../../../../../../../common';
import { useConfirmModal } from '../../hooks/use_confirm_modal';
import { getAgentAndPolicyCount } from '../../services/agent_and_policies_count';

const URL_REGEX = /^(https?):\/\/[^\s$.?#].[^\s]*$/gm;

const ConfirmTitle = () => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalTitle"
    defaultMessage="Save and deploy changes?"
  />
);

interface ConfirmDescriptionProps {
  agentCount: number;
  agentPolicyCount: number;
}

const ConfirmDescription: React.FunctionComponent<ConfirmDescriptionProps> = ({
  agentCount,
  agentPolicyCount,
}) => (
  <FormattedMessage
    id="xpack.fleet.settings.fleetServerHostsFlyout.confirmModalText"
    defaultMessage="This action will update {policies} and {agents}. This action can not be undone. Are you sure you wish to continue?"
    values={{
      agents: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsFlyout.agentsCount"
            defaultMessage="{agentCount, plural, one {# agent} other {# agents}}"
            values={{
              agentCount,
            }}
          />
        </strong>
      ),
      policies: (
        <strong>
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsFlyout.agentPolicyCount"
            defaultMessage="{agentPolicyCount, plural, one {# agent policy} other {# agent policies}}"
            values={{
              agentPolicyCount,
            }}
          />
        </strong>
      ),
    }}
  />
);

function validateFleetServerHosts(value: string[]) {
  if (value.length === 0) {
    return [
      {
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
          defaultMessage: 'At least one URL is required',
        }),
      },
    ];
  }

  const res: Array<{ message: string; index: number }> = [];
  const hostIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
     if(val === ''){
       return [
         {
           message: i18n.translate('xpack.fleet.settings.fleetServerHostsEmptyError', {
             defaultMessage: 'Host URL is required',
           }),
         },
       ];
     }
    else if (!val.match(URL_REGEX)) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.fleetServerHostsError', {
          defaultMessage: 'Invalid URL',
        }),
        index: idx,
      });
    }
    const curIndexes = hostIndexes[val] || [];
    hostIndexes[val] = [...curIndexes, idx];
  });

  Object.values(hostIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.fleetServerHostsDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (res.length) {
    return res;
  }

  if (value.length && isDiffPathProtocol(value)) {
    return [
      {
        message: i18n.translate(
          'xpack.fleet.settings.fleetServerHostsDifferentPathOrProtocolError',
          {
            defaultMessage: 'Protocol and path must be the same for each URL',
          }
        ),
      },
    ];
  }
}

export function useFleetServerHostsForm(
  fleetServerHostsDefaultValue: string[],
  onSuccess: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const { notifications } = useStartServices();
  const { confirm } = useConfirmModal();

  const fleetServerHostsInput = useComboInput(
    'fleetServerHostsInput',
    fleetServerHostsDefaultValue,
    validateFleetServerHosts
  );

  const fleetServerHostsInputValidate = fleetServerHostsInput.validate;
  const validate = useCallback(
    () => fleetServerHostsInputValidate(),
    [fleetServerHostsInputValidate]
  );

  const submit = useCallback(async () => {
    try {
      if (!validate()) {
        return;
      }
      const { agentCount, agentPolicyCount } = await getAgentAndPolicyCount();
      if (
        !(await confirm(
          <ConfirmTitle />,
          <ConfirmDescription agentCount={agentCount} agentPolicyCount={agentPolicyCount} />
        ))
      ) {
        return;
      }
      setIsLoading(true);
      const settingsResponse = await sendPutSettings({
        fleet_server_hosts: fleetServerHostsInput.value,
      });
      if (settingsResponse.error) {
        throw settingsResponse.error;
      }
      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.settings.fleetServerHostsFlyout.successToastTitle', {
          defaultMessage: 'Settings saved',
        })
      );
      setIsLoading(false);
      onSuccess();
    } catch (error) {
      setIsLoading(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.settings.fleetServerHostsFlyout.errorToastTitle', {
          defaultMessage: 'An error happened while saving settings',
        }),
      });
    }
  }, [fleetServerHostsInput.value, validate, notifications, confirm, onSuccess]);

  const isDisabled =
    isLoading || !fleetServerHostsInput.hasChanged || fleetServerHostsInput.props.isInvalid;

  return {
    isLoading,
    isDisabled,
    submit,
    fleetServerHostsInput,
  };
}
