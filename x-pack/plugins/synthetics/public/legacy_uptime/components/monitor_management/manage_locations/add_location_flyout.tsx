/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider } from 'react-hook-form';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyout,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PrivateLocation } from '../../../../../common/runtime_types';
import {
  NEED_FLEET_READ_AGENT_POLICIES_PERMISSION,
  NEED_PERMISSIONS,
} from './manage_locations_flyout';
import { usePrivateLocationPermissions } from '../hooks/use_private_location_permission';
import { LocationForm } from './location_form';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';

export const AddLocationFlyout = ({
  onSubmit,
  setIsOpen,
  privateLocations,
}: {
  onSubmit: (val: PrivateLocation) => void;
  setIsOpen: (val: boolean) => void;
  privateLocations: PrivateLocation[];
}) => {
  const form = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      label: '',
      agentPolicyId: '',
      id: '',
      geo: {
        lat: 0,
        lon: 0,
      },
      concurrentMonitors: 1,
    },
  });

  const { handleSubmit } = form;

  const { canReadAgentPolicies } = usePrivateLocationPermissions();

  const closeFlyout = () => {
    setIsOpen(false);
  };

  return (
    <FormProvider {...form}>
      <EuiFlyout onClose={closeFlyout} style={{ width: 540 }}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{ADD_PRIVATE_LOCATION}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {!canReadAgentPolicies && (
            <EuiCallOut title={NEED_PERMISSIONS} color="warning" iconType="help">
              <p>{NEED_FLEET_READ_AGENT_POLICIES_PERMISSION}</p>
            </EuiCallOut>
          )}
          <LocationForm privateLocations={privateLocations} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
                {CANCEL_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill onClick={handleSubmit(onSubmit)}>
                {SAVE_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </FormProvider>
  );
};

const ADD_PRIVATE_LOCATION = i18n.translate(
  'xpack.synthetics.monitorManagement.addPrivateLocations',
  {
    defaultMessage: 'Add private location',
  }
);

const CANCEL_LABEL = i18n.translate('xpack.synthetics.monitorManagement.cancelLabel', {
  defaultMessage: 'Cancel',
});

const SAVE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.saveLabel', {
  defaultMessage: 'Save',
});
