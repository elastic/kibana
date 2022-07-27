/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { within } from '@testing-library/dom';
import { render } from '../../../lib/helper/rtl_helpers';
import { ServiceLocations } from './locations';
import { LocationStatus } from '../../../../../common/runtime_types';

describe('<ServiceLocations />', () => {
  const setLocations = jest.fn();
  const location = {
    label: 'US Central',
    id: 'us-central',
    geo: {
      lat: 1,
      lon: 1,
    },
    url: 'url',
    isServiceManaged: true,
  };
  const locationTestSubId = `syntheticsServiceLocation--${location.id}`;
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

    expect(screen.queryByText('US Central')).toBeInTheDocument();
  });

  it('shows invalid error', async () => {
    render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={true} />,
      { state }
    );

    expect(screen.getByText('At least one service location must be specified')).toBeInTheDocument();
  });

  it('checks unchecks location', () => {
    const { getByTestId } = render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={true} />,
      { state }
    );

    const checkbox = getByTestId(locationTestSubId) as HTMLInputElement;
    expect(checkbox.checked).toEqual(false);
    fireEvent.click(checkbox);

    expect(setLocations).toHaveBeenCalled();
  });

  it('calls onBlur', () => {
    const onBlur = jest.fn();
    const { getByTestId } = render(
      <ServiceLocations
        selectedLocations={[]}
        setLocations={setLocations}
        isInvalid={true}
        onBlur={onBlur}
      />,
      { state }
    );

    const checkbox = getByTestId(locationTestSubId) as HTMLInputElement;
    fireEvent.click(checkbox);
    fireEvent.blur(checkbox);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('shows experimental badges next to experimental locations', () => {
    const multiLocations = [
      { ...location, id: 'L1', label: 'first', status: LocationStatus.EXPERIMENTAL },
      { ...location, id: 'L2', label: 'second', status: LocationStatus.GA },
      { ...location, id: 'L3', label: 'third', status: LocationStatus.EXPERIMENTAL },
      { ...location, id: 'L4', label: 'fourth', status: LocationStatus.GA },
    ];

    const { getByTestId } = render(
      <ServiceLocations selectedLocations={[]} setLocations={setLocations} isInvalid={true} />,
      {
        state: {
          monitorManagementList: { ...state.monitorManagementList, locations: multiLocations },
        },
      }
    );

    multiLocations.forEach((expectedLocation) => {
      const locationText = getByTestId(`syntheticsServiceLocationText--${expectedLocation.id}`);

      within(locationText).getByText(expectedLocation.label);

      if (expectedLocation.status !== LocationStatus.GA) {
        within(locationText).getByText('Tech Preview');
      } else {
        const techPreviewBadge = within(locationText).queryByText('Tech Preview');
        expect(techPreviewBadge).not.toBeInTheDocument();
      }
    });
  });
});
