/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';

import { CertificateFingerprint } from '.';

jest.mock('../../../common/lib/kibana');

describe('CertificateFingerprint', () => {
  test('renders the expected label', () => {
    render(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );
    expect(screen.getByText('client cert')).toBeInTheDocument();
  });

  test('renders the fingerprint as text', () => {
    render(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );
    expect(screen.getByText('3f4c57934e089f02ae7511200aee2d7e7aabd272')).toBeInTheDocument();
  });

  test('it renders a hyperlink to an external site to compare the fingerprint against a known set of signatures', () => {
    render(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );
    expect(screen.getByText('3f4c57934e089f02ae7511200aee2d7e7aabd272')).toHaveAttribute(
      'href',
      'https://sslbl.abuse.ch/ssl-certificates/sha1/3f4c57934e089f02ae7511200aee2d7e7aabd272'
    );
  });
});
