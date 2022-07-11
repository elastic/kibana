/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useSelector } from 'react-redux';
import { PolicyHostNeeded } from './policy_host_needed';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { PolicyHostsField } from './policy_hosts';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';
import { selectAgentPolicies } from '../../../state/private_locations';

export const LocationForm = ({
  onSubmit,
  loading,
  location,
  onDiscard,
}: {
  onSubmit: (val: PrivateLocation) => void;
  onDiscard?: () => void;
  loading?: boolean;
  location?: PrivateLocation;
}) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitted, isDirty },
  } = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: location || {
      name: '',
      policyHostId: '',
      id: '',
      latLon: '',
      concurrentMonitors: 1,
    },
  });

  const { data } = useSelector(selectAgentPolicies);

  return (
    <>
      {data?.items.length === 0 && <PolicyHostNeeded />}
      <EuiForm
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        isInvalid={isSubmitted && !isValid && !isEmpty(errors)}
        noValidate
      >
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Name">
              <EuiFieldText aria-label="Location name" {...register('name', { required: true })} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <PolicyHostsField errors={errors} control={control} isDisabled={Boolean(location)} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Lat/Lon">
              <EuiFieldText name="latlon" />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Concurrent monitors">
              <EuiRange
                min={5}
                value={10}
                max={50}
                tickInterval={5}
                name="concurrentMonitors"
                id={'concurrentMonitors'}
                showTicks={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              isDisabled={!isDirty && Boolean(location)}
              onClick={() => {
                reset();
                onDiscard?.();
              }}
            >
              Discard
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" type="submit" fill isLoading={loading} isDisabled={!isDirty}>
              {location ? 'Update location' : 'Create location'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};
