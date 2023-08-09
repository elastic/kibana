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
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { CHOOSE_FROM_THE_LIST, LEARN_MORE } from './translations';
import { EndpointActionText } from './utils';
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
  const {
    docLinks: {
      links: {
        securitySolution: { responseActions },
      },
    },
  } = useKibana().services;

  const fieldOptions = useMemo(
    () =>
      ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS.map((name) => {
        const missingRbac = !getRbacControl({
          commandName: getUiCommand(name),
          privileges: endpointPrivileges,
        });
        const commandAlreadyExists = map(data.responseActions, 'params.command').includes(name);
        const isDisabled = commandAlreadyExists || missingRbac;

        return {
          value: name,
          inputDisplay: name,
          dropdownDisplay: <EndpointActionText name={name} isDisabled={missingRbac} />,
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
          defaultMessage: 'Response action',
        }),
        helpText: (
          <FormattedMessage
            id="xpack.securitySolution.responseActions.endpoint.commandDescription"
            defaultMessage="Select an endpoint response action. The response action only runs on hosts with Elastic Defend installed. {docs}"
            values={{
              docs: (
                <EuiLink href={responseActions} target="_blank">
                  {LEARN_MORE}
                </EuiLink>
              ),
            }}
          />
        ),
        validations: [
          {
            validator: fieldValidators.emptyField(
              i18n.translate(
                'xpack.securitySolution.responseActions.endpoint.validations.commandIsRequiredErrorMessage',
                {
                  defaultMessage: 'Action is a required field.',
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
          placeholder: CHOOSE_FROM_THE_LIST,
          'data-test-subj': 'commandTypeField',
        },
      }}
    />
  );
};

export const ActionTypeField = React.memo(ActionTypeFieldComponent);
