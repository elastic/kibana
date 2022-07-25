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
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
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
  privateLocations,
}: {
  onSubmit: (val: PrivateLocation) => void;
  onDiscard?: () => void;
  loading?: boolean;
  location?: PrivateLocation;
  privateLocations: PrivateLocation[];
}) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitted, isDirty },
  } = useFormWrapped({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: location || {
      name: '',
      policyHostId: '',
      id: '',
      geo: {
        lat: 0,
        lon: 0,
      },
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
            <EuiFormRow
              label={LOCATION_NAME_LABEL}
              isInvalid={Boolean(errors?.name)}
              error={errors?.name?.message}
            >
              <EuiFieldText
                disabled={Boolean(location)}
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
          </EuiFlexItem>
          <EuiFlexItem>
            <PolicyHostsField
              errors={errors}
              control={control}
              isDisabled={Boolean(location)}
              privateLocations={privateLocations}
            />
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
              {DISCARD_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" type="submit" fill isLoading={loading} isDisabled={!isDirty}>
              {location ? UPDATE_LOCATION_LABEL : CREATE_LOCATION_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    </>
  );
};

const LOCATION_NAME_LABEL = i18n.translate('xpack.synthetics.monitorManagement.locationName', {
  defaultMessage: 'Location name',
});

const DISCARD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.discard', {
  defaultMessage: 'Discard',
});

const UPDATE_LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.updateLocation', {
  defaultMessage: 'Update location',
});

const CREATE_LOCATION_LABEL = i18n.translate('xpack.synthetics.monitorManagement.createLocation', {
  defaultMessage: 'Create location',
});

const NAME_ALREADY_EXISTS = i18n.translate('xpack.synthetics.monitorManagement.alreadyExists', {
  defaultMessage: 'Location name already exists.',
});

const NAME_REQUIRED = i18n.translate('xpack.synthetics.monitorManagement.nameRequired', {
  defaultMessage: 'Location name is required',
});
