/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiFieldText, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { PolicyHostsField } from './policy_hosts';
import { selectAgentPolicies } from '../../../state/private_locations';

export const LocationForm = ({
  setFormData,
  privateLocations,
}: {
  setFormData: (val: Partial<PrivateLocation>) => void;
  onDiscard?: () => void;
  privateLocations: PrivateLocation[];
}) => {
  const { data } = useSelector(selectAgentPolicies);

  const {
    getValues,
    control,
    register,
    formState: { errors },
  } = useFormWrapped<PrivateLocation>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      name: '',
      agentPolicyId: '',
      id: '',
      geo: {
        lat: 0,
        lon: 0,
      },
      concurrentMonitors: 1,
    },
  });

  const name = getValues('name');
  const agentPolicyId = getValues('agentPolicyId');

  useEffect(() => {
    if (name && agentPolicyId) {
      setFormData({ name, agentPolicyId });
    }
  }, [name, agentPolicyId, setFormData]);

  return (
    <>
      {data?.items.length === 0 && <AgentPolicyNeeded />}
      <EuiForm component="form" noValidate>
        <EuiFormRow
          fullWidth
          label={LOCATION_NAME_LABEL}
          isInvalid={Boolean(errors?.name)}
          error={errors?.name?.message}
        >
          <EuiFieldText
            fullWidth
            aria-label={LOCATION_NAME_LABEL}
            {...register('name', {
              required: {
                value: true,
                message: NAME_REQUIRED,
              },
              validate: (val: string) => {
                return privateLocations.some((loc) => loc.name === val)
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
