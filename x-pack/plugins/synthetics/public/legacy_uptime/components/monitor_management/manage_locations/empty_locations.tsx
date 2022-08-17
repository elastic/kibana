/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { setAddingNewPrivateLocation, setManageFlyoutOpen } from '../../../state/private_locations';

export const EmptyLocations = ({
  inFlyout = true,
  setIsAddingNew,
  disabled,
}: {
  inFlyout?: boolean;
  disabled?: boolean;
  setIsAddingNew?: (val: boolean) => void;
}) => {
  const dispatch = useDispatch();

  return (
    <EuiEmptyPrompt
      hasBorder
      title={<h2>{ADD_FIRST_LOCATION}</h2>}
      titleSize="s"
      body={
        <EuiText size="s">
          {!inFlyout ? FIRST_MONITOR : ''} {START_ADDING_LOCATIONS_DESCRIPTION}
        </EuiText>
      }
      actions={
        <EuiButton
          disabled={disabled}
          color="primary"
          fill
          onClick={() => {
            setIsAddingNew?.(true);
            dispatch(setManageFlyoutOpen(true));
            dispatch(setAddingNewPrivateLocation(true));
          }}
        >
          {ADD_LOCATION}
        </EuiButton>
      }
      footer={
        <EuiText size="s">
          {LEARN_MORE}{' '}
          <EuiLink
            href="https://www.elastic.co/guide/en/observability/current/uptime-set-up-choose-agent.html#private-locations"
            target="_blank"
          >
            {READ_DOCS}
          </EuiLink>
        </EuiText>
      }
    />
  );
};

const FIRST_MONITOR = i18n.translate('xpack.synthetics.monitorManagement.firstLocationMonitor', {
  defaultMessage: 'In order to create a monitor, you will need to add a location first.',
});

const ADD_FIRST_LOCATION = i18n.translate('xpack.synthetics.monitorManagement.firstLocation', {
  defaultMessage: 'Add your first private location',
});

const START_ADDING_LOCATIONS_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.startAddingLocationsDescription',
  {
    defaultMessage:
      'Private locations allow you to run monitors from your own premises. They require an Elastic agent and Agent policy which you can control and maintain via Fleet.',
  }
);

const ADD_LOCATION = i18n.translate('xpack.synthetics.monitorManagement.addLocation', {
  defaultMessage: 'Add location',
});

export const READ_DOCS = i18n.translate('xpack.synthetics.monitorManagement.readDocs', {
  defaultMessage: 'read the docs',
});

export const LEARN_MORE = i18n.translate('xpack.synthetics.monitorManagement.learnMore', {
  defaultMessage: 'For more information,',
});
