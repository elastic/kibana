/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithRouter, shallowWithRouter } from '../../lib';
import { CertificateSearch } from './cert_search';

describe('CertificatesSearch', () => {
  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertificateSearch setSearch={jest.fn()} />)).toMatchSnapshot();
  });
  it('renders expected elements for valid props', () => {
    expect(renderWithRouter(<CertificateSearch setSearch={jest.fn()} />)).toMatchSnapshot();
  });
});
