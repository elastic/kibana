/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, EuiTitle, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { setManageFlyoutOpen } from '../../../state/private_locations';

export const EmptyLocations = ({
  setIsAddingNew,
  disabled,
}: {
  disabled?: boolean;
  setIsAddingNew?: (val: boolean) => void;
}) => {
  const dispatch = useDispatch();

  return (
    <EuiEmptyPrompt
      iconType="visMapCoordinate"
      title={<h2>{START_ADDING_LOCATIONS}</h2>}
      body={<p>{START_ADDING_LOCATIONS_DESCRIPTION}</p>}
      actions={
        <EuiButton
          disabled={disabled}
          color="primary"
          fill
          onClick={() => {
            setIsAddingNew?.(true);
            dispatch(setManageFlyoutOpen(true));
          }}
        >
          {ADD_LOCATION}
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>{LEARN_MORE}</h3>
          </EuiTitle>
          <EuiLink href="#" target="_blank">
            {READ_DOCS}
          </EuiLink>
        </>
      }
    />
  );
};

const START_ADDING_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.startAddingLocations',
  {
    defaultMessage: 'Start adding private locations',
  }
);

const START_ADDING_LOCATIONS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.startAddingLocationsDescription',
  {
    defaultMessage: 'Add your first private location to run monitors on premiss via Elastic agent.',
  }
);

const ADD_LOCATION = i18n.translate('xpack.synthetics.monitorManagement.addLocation', {
  defaultMessage: 'Add location',
});

const READ_DOCS = i18n.translate('xpack.synthetics.monitorManagement.readDocs', {
  defaultMessage: 'Read the docs',
});

const LEARN_MORE = i18n.translate('xpack.synthetics.monitorManagement.learnMore', {
  defaultMessage: 'Want to learn more?',
});
