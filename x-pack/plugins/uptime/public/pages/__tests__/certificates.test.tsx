/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithRouter } from '../../lib';
import { CertificatesPage } from '../certificates';

describe('CertificatesPage', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertificatesPage />)).toMatchSnapshot();
  });
});
