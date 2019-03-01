/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TestProviders } from 'x-pack/plugins/secops/public/mock/test_providers';

import { DraggableSignatureId, GoogleLink, SuricataSignature, Tokens } from './suricata_signature';

describe('SuricataSignature', () => {
  describe('rendering', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <SuricataSignature
            id="doc-id-123"
            signatureId="id-123"
            signature="ET SCAN ATTACK Hello"
          />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('GoogleLink', () => {
    test('it renders text passed in as value', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http:/example.com/'} value={'Example Link'} />
      );
      expect(wrapper.text()).toEqual('Example Link');
    });

    test('it renders props passed in as link', () => {
      const wrapper = mountWithIntl(
        <GoogleLink link={'http:/example.com/'} value={'Example Link'} />
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.google.com/search?q=http:/example.com/'
      );
    });

    test("it encodes <script>alert('XSS')</script>", () => {
      const wrapper = mountWithIntl(
        <GoogleLink
          link={"http:/example.com?q=<script>alert('XSS')</script>"}
          value={'Example Link'}
        />
      );
      expect(wrapper.find('a').prop('href')).toEqual(
        "https://www.google.com/search?q=http:/example.com?q=%3Cscript%3Ealert('XSS')%3C/script%3E"
      );
    });
  });

  describe('Tokens', () => {
    test('should render empty if tokens are empty', () => {
      const wrapper = mountWithIntl(<Tokens tokens={[]} />);
      expect(wrapper.text()).toEqual(null);
    });

    test('should render a single if it is present', () => {
      const wrapper = mountWithIntl(
        <div>
          <Tokens tokens={['ET']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ET');
    });

    test('should render the multiple tokens if they are present', () => {
      const wrapper = mountWithIntl(
        <div>
          <Tokens tokens={['ET', 'SCAN']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ETSCAN');
    });
  });

  describe('DraggableSignatureId', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableSignatureId id="id-123" signatureId="signature-123" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('signature-123');
    });
  });
});
