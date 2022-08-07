/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CertificatesPage } from './certificates';
import { render } from '../lib/helper/rtl_helpers';

describe('CertificatesPage', () => {
  it('renders expected elements for valid props', async () => {
    const { findByText } = render(<CertificatesPage />);

    expect(await findByText('This table contains 0 rows; Page 1 of 0.')).toBeInTheDocument();
    expect(
      await findByText(
        'No Certificates found. Note: Certificates are only visible for Heartbeat 7.8+'
      )
    ).toBeInTheDocument();
  });
});
