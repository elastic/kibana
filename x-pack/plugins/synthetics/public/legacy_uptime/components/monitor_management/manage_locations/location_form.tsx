/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useFormContext, useFormState } from 'react-hook-form';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { PolicyHostsField } from './policy_hosts';
import { selectAgentPolicies } from '../../../state/private_locations';

export const LocationForm = ({
  privateLocations,
}: {
  onDiscard?: () => void;
  privateLocations: PrivateLocation[];
}) => {
  const { data } = useSelector(selectAgentPolicies);
  const { control, register } = useFormContext<PrivateLocation>();
  const { errors } = useFormState();

  return (
    <>
      {data?.items.length === 0 && <AgentPolicyNeeded />}
      <EuiForm component="form" noValidate>
        <EuiFormRow
          fullWidth
          label={LOCATION_NAME_LABEL}
          isInvalid={Boolean(errors?.label)}
          error={errors?.label?.message}
        >
          <EuiFieldText
            fullWidth
            aria-label={LOCATION_NAME_LABEL}
            {...register('label', {
              required: {
                value: true,
                message: NAME_REQUIRED,
              },
              validate: (val: string) => {
                return privateLocations.some((loc) => loc.label === val)
                  ? NAME_ALREADY_EXISTS
                  : undefined;
              },
            })}
          />
        </EuiFormRow>
        <EuiSpacer />
        <PolicyHostsField errors={errors} control={control} privateLocations={privateLocations} />
      </EuiForm>
    </>
  );
};

export const LOCATION_NAME_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.locationName',
  {
    defaultMessage: 'Location name',
  }
);

const NAME_ALREADY_EXISTS = i18n.translate('xpack.synthetics.monitorManagement.alreadyExists', {
  defaultMessage: 'Location name already exists.',
});

const NAME_REQUIRED = i18n.translate('xpack.synthetics.monitorManagement.nameRequired', {
  defaultMessage: 'Location name is required',
});
