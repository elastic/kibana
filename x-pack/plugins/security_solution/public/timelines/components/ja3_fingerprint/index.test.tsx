/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { TestProviders } from '../../../common/mock';
import '../../../common/mock/match_media';
import { useMountAppended } from '../../../common/utils/use_mount_appended';

import { Ja3Fingerprint } from '.';

jest.mock('../../../common/lib/kibana');

describe('Ja3Fingerprint', () => {
  const mount = useMountAppended();

  test('renders the expected label', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="ja3-fingerprint-label"]').first().text()).toEqual('ja3');
  });

  test('renders the fingerprint as text', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(
      removeExternalLinkText(wrapper.find('[data-test-subj="ja3-fingerprint-link"]').first().text())
    ).toContain('fff799d91b7c01ae3fe6787cfc895552');
  });

  test('it renders a hyperlink to an external site to compare the fingerprint against a known set of signatures', () => {
    const wrapper = mount(
      <TestProviders>
        <Ja3Fingerprint
          eventId="KzNOvGkBqd-n62SwSPa4"
          contextId="test"
          fieldName="tls.fingerprints.ja3.hash"
          value="fff799d91b7c01ae3fe6787cfc895552"
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="ja3-fingerprint-link"]').first().props().href).toEqual(
      'https://sslbl.abuse.ch/ja3-fingerprints/fff799d91b7c01ae3fe6787cfc895552'
    );
  });
});
