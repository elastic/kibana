/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IndicesForm } from '../indices_form';
import { shallowWithRouter } from '../../../lib';

describe('CertificateForm', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(
      shallowWithRouter(
        <IndicesForm
          loading={false}
          onChange={jest.fn()}
          formFields={{
            heartbeatIndices: 'heartbeat-8*',
            certAgeThreshold: 36,
            certExpirationThreshold: 7,
            defaultConnectors: [],
          }}
          fieldErrors={null}
          isDisabled={false}
        />
      )
    ).toMatchSnapshot();
  });
});
