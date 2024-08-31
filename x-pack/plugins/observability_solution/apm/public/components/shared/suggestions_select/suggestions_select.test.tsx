/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import * as stories from './suggestions_select.stories';
import userEvent from '@testing-library/user-event';
import { createCallApmApi } from '../../../services/rest/create_call_apm_api';
import { CoreStart } from '@kbn/core/public';
import * as callApiExports from '../../../services/rest/call_api';

const { Example } = composeStories(stories);

const callApi = jest
  .spyOn(callApiExports, 'callApi')
  .mockImplementation(() => Promise.resolve(null));

describe('SuggestionsSelect', () => {
  beforeEach(() => {
    createCallApmApi({} as CoreStart);
  });

  afterEach(() => {
    callApi.mockClear();
  });

  it('renders', async () => {
    render(<Example />);

    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });
  it('renders without calling the API initially', async () => {
    render(<Example />);

    // Ensure the combobox is rendered
    expect(await screen.findByRole('combobox')).toBeInTheDocument();

    // Check that useFetcher is not called on initial render
    expect(callApi).not.toHaveBeenCalled();
  });
  it('calls the API after search value changes', async () => {
    const component = render(<Example />);

    const comboBoxEle = await component.findByRole('combobox');

    await act(async () => {
      userEvent.paste(comboBoxEle, 'test');
    });

    await expect(callApi).toHaveBeenCalledTimes(1);
  });
});
