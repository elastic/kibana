/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { HttpError } from '../../../../../common/types/api';

import { ErrorStatePrompt } from '../../../shared/error_state';
import { NotFoundPrompt } from '../../../shared/not_found';
import { SendEnterpriseSearchTelemetry } from '../../../shared/telemetry';

import { mountWithIntl } from '../../../test_helpers';

import { SearchApplicationError } from './search_application_error';

describe('SearchApplicationError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });

  it('renders 404 prompt for 404 error', () => {
    const error = {
      body: {
        error: 'NOT_FOUND',
        message: 'Not Found',
        statusCode: 404,
      },
    } as HttpError;
    const wrapper = mountWithIntl(<SearchApplicationError error={error} />);

    expect(wrapper.find(NotFoundPrompt)).toHaveLength(1);
    expect(wrapper.find(SendEnterpriseSearchTelemetry)).toHaveLength(1);
    expect(wrapper.find(ErrorStatePrompt)).toHaveLength(0);

    const notFound = wrapper.find(NotFoundPrompt);
    expect(notFound.prop('backToLink')).toEqual('/search_applications');
    expect(notFound.prop('backToContent')).toEqual('Back to Search Applications');

    const telemetry = wrapper.find(SendEnterpriseSearchTelemetry);
    expect(telemetry.prop('action')).toEqual('error');
    expect(telemetry.prop('metric')).toEqual('not_found');
  });

  it('renders error prompt for api errors', () => {
    const error = {
      body: {
        error: 'ERROR',
        message: 'Internal Server Error',
        statusCode: 500,
      },
    } as HttpError;
    const wrapper = mountWithIntl(<SearchApplicationError error={error} />);

    expect(wrapper.find(ErrorStatePrompt)).toHaveLength(1);
    expect(wrapper.find(SendEnterpriseSearchTelemetry)).toHaveLength(1);
    expect(wrapper.find(NotFoundPrompt)).toHaveLength(0);

    const telemetry = wrapper.find(SendEnterpriseSearchTelemetry);
    expect(telemetry.prop('action')).toEqual('error');
    expect(telemetry.prop('metric')).toEqual('cannot_connect');
  });
});
