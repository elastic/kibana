/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CertMonitors } from './cert_monitors';
import { renderWithRouter, shallowWithRouter } from '../../lib';

describe('CertMonitors', () => {
  const certMons = [
    { name: '', id: 'bad-ssl-dashboard', url: 'https://badssl.com/dashboard/' },
    { name: 'elastic', id: 'elastic-co', url: 'https://www.elastic.co/' },
    { name: '', id: 'extended-validation', url: 'https://extended-validation.badssl.com/' },
  ];
  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<CertMonitors monitors={certMons} />)).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    expect(renderWithRouter(<CertMonitors monitors={certMons} />)).toMatchSnapshot();
  });
});
