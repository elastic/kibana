/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { HttpError } from '../../../../../../../common/types/api';

import { TextExpansionErrors } from './text_expansion_errors';

describe('TextExpansionErrors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });
  const error = {
    body: {
      error: 'some-error',
      message: 'some-error-message',
      statusCode: 500,
    },
  } as HttpError;
  it('renders error panel if ELSER deployment fails', () => {
    const wrapper = shallow(
      <TextExpansionErrors createError={error} fetchError={undefined} startError={undefined} />
    );
    expect(wrapper.find(EuiCallOut).length).toBe(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual('Error with ELSER deployment');
  });
  it('renders error panel if ELSER fetching fails', () => {
    const wrapper = shallow(
      <TextExpansionErrors createError={undefined} fetchError={error} startError={undefined} />
    );
    expect(wrapper.find(EuiCallOut).length).toBe(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual('Error fetching ELSER model');
  });
  it('renders error panel if ELSER starting fails', () => {
    const wrapper = shallow(
      <TextExpansionErrors createError={undefined} fetchError={undefined} startError={error} />
    );
    expect(wrapper.find(EuiCallOut).length).toBe(1);
    expect(wrapper.find(EuiCallOut).prop('title')).toEqual('Error starting ELSER deployment');
  });
  it('extracts and renders the error message', () => {
    const wrapper = shallow(
      <TextExpansionErrors createError={error} fetchError={undefined} startError={undefined} />
    );
    expect(wrapper.find(EuiCallOut).find('p').length).toBe(1);
    expect(wrapper.find(EuiCallOut).find('p').text()).toEqual(error?.body?.message);
  });
});
