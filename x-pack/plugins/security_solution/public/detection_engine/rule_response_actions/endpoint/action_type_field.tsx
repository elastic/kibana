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
import { FormattedMessage } from '@kbn/i18n-react';
import { getUiCommand } from '../../../management/components/endpoint_response_actions_list/components/hooks';
import { getRbacControl } from '../../../management/components/endpoint_responder/lib/utils';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../../../../common/endpoint/service/response_actions/constants';

interface ActionTypeFieldProps {
  euiFieldProps?: Record<string, unknown>;
}

const ActionTypeFieldComponent = ({ euiFieldProps }: ActionTypeFieldProps) => {
  const {
    field: { onChange, value, name: fieldName },
    fieldState: { error },
  } = useController({
    name: 'command',
    defaultValue: '',
  });

  const endpointPrivileges = useUserPrivileges().endpointPrivileges;
  const FIELD_OPTIONS = useMemo(() => {
    return RESPONSE_ACTION_API_COMMANDS_NAMES.map((name, index) => ({
      value: name,
      inputDisplay: (
        <FormattedMessage
          // temporary
          id="xpack.osquery.pack.queryFlyoutForm.resultsTypeField.snapshotValueLabel"
          defaultMessage={name}
        />
      ),
      disabled: !getRbacControl({
        commandName: getUiCommand(name),
        privileges: endpointPrivileges,
      }),
    }));
  }, [endpointPrivileges]);

  const hasError = useMemo(() => !!error?.message, [error?.message]);

  return (
    <EuiFormRow
      // fix path
      label={i18n.translate('xpack.osquery.pack.form.commandFieldLabel', {
        defaultMessage: 'Command',
      })}
      error={error?.message}
      isInvalid={hasError}
      fullWidth
    >
      <EuiSuperSelect
        isInvalid={hasError}
        name={fieldName}
        data-test-subj={'resultsTypeField'}
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
