/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';

import { Ja3Fingerprint } from '.';

jest.mock('../../../common/lib/kibana');

describe('Ja3Fingerprint', () => {
  test('renders the expected label', () => {
    render(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(screen.getByText('ja3')).toBeInTheDocument();
  });

  test('renders the fingerprint as text', () => {
    render(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(screen.getByText('fff799d91b7c01ae3fe6787cfc895552')).toBeInTheDocument();
  });

  test('it renders a hyperlink to an external site to compare the fingerprint against a known set of signatures', () => {
    render(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(screen.getByText('fff799d91b7c01ae3fe6787cfc895552')).toHaveAttribute(
      'href',
      'https://sslbl.abuse.ch/ja3-fingerprints/fff799d91b7c01ae3fe6787cfc895552'
    );
  });
});
