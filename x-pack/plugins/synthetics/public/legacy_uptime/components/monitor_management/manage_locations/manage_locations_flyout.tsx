/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import {
  EuiFlyout,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ManageEmptyState } from './manage_empty_state';
import { useEnablement } from '../hooks/use_enablement';
import { AddLocationFlyout } from './add_location_flyout';
import { ClientPluginsStart } from '../../../../plugin';
import { getServiceLocations } from '../../../state/actions';
import { PrivateLocationsList } from './locations_list';
import { useLocationsAPI } from './hooks/use_locations_api';
import {
  getAgentPoliciesAction,
  selectAddingNewPrivateLocation,
  selectManageFlyoutOpen,
  setAddingNewPrivateLocation,
  setManageFlyoutOpen,
} from '../../../state/private_locations';
import { PrivateLocation } from '../../../../../common/runtime_types';

export const ManageLocationsFlyout = () => {
  const dispatch = useDispatch();

  const { isEnabled } = useEnablement().enablement;

  const setIsOpen = (val: boolean) => dispatch(setManageFlyoutOpen(val));

  const isOpen = useSelector(selectManageFlyoutOpen);
  const isAddingNew = useSelector(selectAddingNewPrivateLocation);

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const { onSubmit, loading, privateLocations, onDelete } = useLocationsAPI({
    isOpen,
  });

  const { fleet } = useKibana<ClientPluginsStart>().services;

  const hasFleetPermissions = Boolean(fleet?.authz.fleet.readAgentPolicies);

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  useEffect(() => {
    if (isOpen) {
      dispatch(getAgentPoliciesAction.get());
    }
  }, [dispatch, isOpen]);

  const closeFlyout = () => {
    setIsOpen(false);
    dispatch(getServiceLocations());
  };

  const handleSubmit = (formData: PrivateLocation) => {
    onSubmit(formData);
    setIsAddingNew(false);
  };

  const flyout = (
    <EuiFlyout onClose={closeFlyout} size="m" style={{ width: 540 }}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{PRIVATE_LOCATIONS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading ? (
          <EuiLoadingSpinner />
        ) : (
          <ManageEmptyState
            privateLocations={privateLocations}
            setIsAddingNew={setIsAddingNew}
            hasFleetPermissions={hasFleetPermissions}
          >
            <PrivateLocationsList privateLocations={privateLocations} onDelete={onDelete} />
          </ManageEmptyState>
        )}
        {!hasFleetPermissions && (
          <EuiCallOut title={NEED_PERMISSIONS} color="warning" iconType="help">
            <p>{NEED_FLEET_READ_AGENT_POLICIES_PERMISSION}</p>
          </EuiCallOut>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              {CLOSE_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj={'addPrivateLocationButton'}
              isLoading={loading}
              disabled={!hasFleetPermissions || !canSave}
              onClick={() => setIsAddingNew(true)}
            >
              {ADD_LABEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return (
    <div>
      {isEnabled && (
        <EuiButtonEmpty onClick={() => setIsOpen(true)}>{PRIVATE_LOCATIONS}</EuiButtonEmpty>
      )}
      {isOpen && !isAddingNew ? flyout : null}
      {isAddingNew ? (
        <AddLocationFlyout
          setIsOpen={setIsAddingNew}
          onSubmit={handleSubmit}
          privateLocations={privateLocations}
        />
      ) : null}
    </div>
  );
};

const PRIVATE_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.managePrivateLocations',
  {
    defaultMessage: 'Private locations',
  }
);

const CLOSE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.closeLabel', {
  defaultMessage: 'Close',
});

const ADD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.addLocation', {
  defaultMessage: 'Add location',
});

export const NEED_PERMISSIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.needPermissions',
  {
    defaultMessage: 'Need permissions',
  }
);

export const NEED_FLEET_READ_AGENT_POLICIES_PERMISSION = i18n.translate(
  'xpack.synthetics.monitorManagement.needFleetReadAgentPoliciesPermission',
  {
    defaultMessage:
      'You are not authorized to access Fleet. Fleet permissions are required to create new private locations.',
  }
);
