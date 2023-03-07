/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { difference } from 'lodash';
import { getUiCommand } from '../../../management/components/endpoint_response_actions_list/components/hooks';
import { getRbacControl } from '../../../management/components/endpoint_responder/lib/utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { ENABLED_RESPONSE_ACTION_COMMANDS } from '../../../../common/endpoint/service/response_actions/constants';

interface ActionTypeFieldProps {
  euiFieldProps?: Record<string, unknown>;
  disabled: boolean;
  usedEndpointCommands: string[];
}

const ActionTypeFieldComponent = ({
  euiFieldProps,
  disabled,
  usedEndpointCommands,
}: ActionTypeFieldProps) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'command',
    defaultValue: '',
  });

  const AVAILABLE_COMMANDS = useMemo(() => {
    return difference(
      ENABLED_RESPONSE_ACTION_COMMANDS,
      usedEndpointCommands.filter((commandName) => commandName !== value)
    );
  }, [usedEndpointCommands, value]);

  const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const FIELD_OPTIONS = useMemo(() => {
    return ENABLED_RESPONSE_ACTION_COMMANDS.map((name) => {
      const isDisabled =
        !AVAILABLE_COMMANDS.includes(name) ||
        !getRbacControl({
          commandName: getUiCommand(name),
          privileges: endpointPrivileges,
        });

      return {
        value: name,
        inputDisplay: name,
        disabled: isDisabled,
        'data-test-subj': `command-type-${name}`,
      };
    });
  }, [AVAILABLE_COMMANDS, endpointPrivileges]);

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.securitySolution.responseActions.endpoint.commandLabel', {
        defaultMessage: 'Command',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiSuperSelect
        disabled={disabled}
        isInvalid={hasError}
        name={fieldName}
        data-test-subj={'commandTypeField'}
        options={FIELD_OPTIONS}
        fullWidth
        valueOfSelected={value}
        onChange={onChange}
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};

export const ActionTypeField = React.memo(ActionTypeFieldComponent);
