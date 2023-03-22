/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SuperSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { getUiCommand } from '../../../management/components/endpoint_response_actions_list/components/hooks';
import { getRbacControl } from '../../../management/components/endpoint_responder/lib/console_commands_definition';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS } from '../../../../common/endpoint/service/response_actions/constants';

interface ActionTypeFieldProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

const ActionTypeFieldComponent = ({
  basePath,
  disabled,
  readDefaultValueOnForm,
}: ActionTypeFieldProps) => {
  const { endpointPrivileges } = useUserPrivileges();
  const [data] = useFormData();

  const fieldOptions = useMemo(
    () =>
      ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.map((name) => {
        const isDisabled =
          map(data.responseActions, 'params.command').includes(name) ||
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
      }),
    [data.responseActions, endpointPrivileges]
  );

  return (
    <UseField
      path={`${basePath}.command`}
      readDefaultValueOnForm={readDefaultValueOnForm}
      config={{
        label: i18n.translate('xpack.securitySolution.responseActions.endpoint.commandLabel', {
          defaultMessage: 'Command',
        }),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate(
                'xpack.securitySolution.responseActions.endpoint.validations.commandIsRequiredErrorMessage',
                {
                  defaultMessage: 'A command is required.',
                }
              )
            ),
          },
        ],
      }}
      component={SuperSelectField}
      isDisabled={disabled}
      componentProps={{
        euiFieldProps: {
          options: fieldOptions,
          'data-test-subj': 'commandTypeField',
        },
      }}
    />
  );
};

export const ActionTypeField = React.memo(ActionTypeFieldComponent);
