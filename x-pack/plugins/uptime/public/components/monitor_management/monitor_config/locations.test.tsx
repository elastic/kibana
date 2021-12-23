/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { ServiceLocations, LOCATIONS_LABEL } from './locations';
import userEvent from '@testing-library/user-event';

describe('<ActionBar />', () => {
  const setLocations = jest.fn();
  const location = {
    label: 'US Central',
    id: 'us-central',
    geo: {
      lat: 1,
      lon: 1,
    },
    url: 'url',
  };
  const state = {
    monitorManagementList: {
      locations: [location],
      list: {
        monitors: [],
        perPage: 10,
        page: 1,
        total: 0,
      },
      error: {
        serviceLocations: null,
        monitorList: null,
      },
      loading: {
        serviceLocations: false,
        monitorList: false,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders locations', () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={false} />,
      { state }
    );

    expect(screen.getByText(LOCATIONS_LABEL)).toBeInTheDocument();
    expect(screen.queryByText('US Central')).not.toBeInTheDocument();
  });

  it('shows location options when clicked', async () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={false} />,
      { state }
    );

    userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('US Central')).toBeInTheDocument();
  });

  it('prevents bad inputs', async () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={false} />,
      { state }
    );

    userEvent.click(screen.getByRole('button'));
    userEvent.type(screen.getByRole('textbox'), 'fake location');

    expect(screen.getByText("doesn't match any options")).toBeInTheDocument();

    userEvent.keyboard(`{enter}`);

    expect(screen.getByText('"fake location" is not a valid option')).toBeInTheDocument();
  });

  it('calls setLocations', async () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={false} />,
      { state }
    );

    userEvent.click(screen.getByRole('button'));
    userEvent.click(screen.getByText('US Central'));

    expect(setLocations).toBeCalledWith([location]);
  });

  it('shows invalid error', async () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={true} />,
      { state }
    );

    expect(screen.getByText('At least one service location must be specified')).toBeInTheDocument();
  });
});
