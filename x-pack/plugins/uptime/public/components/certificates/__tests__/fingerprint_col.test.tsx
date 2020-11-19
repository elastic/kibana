/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithRouter, shallowWithRouter } from '../../../lib';
import { FingerprintCol } from '../fingerprint_col';
import moment from 'moment';

describe('FingerprintCol', () => {
  const cert = {
    monitors: [{ name: '', id: 'github', url: 'https://github.com/' }],
    not_after: '2020-05-08T00:00:00.000Z',
    not_before: '2018-05-08T00:00:00.000Z',
    issuer: 'DigiCert SHA2 Extended Validation Server CA',
    sha1: 'ca06f56b258b7a0d4f2b05470939478651151984',
    sha256: '3111500c4a66012cdae333ec3fca1c9dde45c954440e7ee413716bff3663c074',
    common_name: 'github.com',
  };

  it('shallow renders expected elements for valid props', () => {
    expect(shallowWithRouter(<FingerprintCol cert={cert} />)).toMatchSnapshot();
  });

  it('renders expected elements for valid props', () => {
    cert.not_after = moment().add('4', 'months').toISOString();

    expect(renderWithRouter(<FingerprintCol cert={cert} />)).toMatchSnapshot();
  });
});
