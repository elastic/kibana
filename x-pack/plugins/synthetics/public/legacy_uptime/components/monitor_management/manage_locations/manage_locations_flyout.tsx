/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { EmptyLocations } from './empty_locations';
import { getServiceLocations } from '../../../state/actions';
import { LocationForm } from './location_form';
import { PrivateLocationsList } from './locations_list';
import { useLocationsAPI } from './hooks/use_locations_api';
import { getAgentPoliciesAction } from '../../../state/private_locations';

export const ManageLocationsFlyout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const { onSubmit, loading, privateLocations, onDelete } = useLocationsAPI();

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAgentPoliciesAction.get());
  }, [dispatch]);

  const closeFlyout = () => {
    setIsOpen(false);
    dispatch(getServiceLocations());
  };

  const flyout = (
    <EuiFlyout onClose={closeFlyout}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Manage private locations</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {privateLocations.length === 0 && !loading && !isAddingNew ? (
          <EmptyLocations setIsAddingNew={setIsAddingNew} />
        ) : (
          <PrivateLocationsList
            privateLocations={privateLocations}
            loading={loading}
            onDelete={onDelete}
            onSubmit={onSubmit}
          />
        )}
        <EuiSpacer />
        {isAddingNew && (
          <LocationForm
            onSubmit={(val) => {
              onSubmit(val);
              setIsAddingNew(false);
            }}
            onDiscard={() => setIsAddingNew(false)}
          />
        )}
        {!isAddingNew && privateLocations.length > 0 && (
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton fill isLoading={loading} onClick={() => setIsAddingNew(true)}>
                Add location
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );

  return (
    <div>
      <EuiButtonEmpty onClick={() => setIsOpen(true)} iconType="visMapCoordinate">
        Manage private locations
      </EuiButtonEmpty>
      {isOpen ? flyout : null}
    </div>
  );
};
