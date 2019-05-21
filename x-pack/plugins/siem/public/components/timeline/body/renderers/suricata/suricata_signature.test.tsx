/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../../mock';
import {
  SuricataSignature,
  Tokens,
  DraggableSignatureId,
  SURICATA_SIGNATURE_ID_FIELD_NAME,
} from './suricata_signature';

describe('SuricataSignature', () => {
  describe('rendering', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = shallow(
        <SuricataSignature id="doc-id-123" signatureId={123} signature="ET SCAN ATTACK Hello" />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Tokens', () => {
    test('should render empty if tokens are empty', () => {
      const wrapper = mountWithIntl(<Tokens tokens={[]} />);
      expect(wrapper.text()).toBeNull();
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
          <DraggableSignatureId id="id-123" signatureId={123} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('123');
    });

    test('it renders a tooltip for the signature field', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableSignatureId id="id-123" signatureId={123} />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="signature-id-tooltip"]')
          .first()
          .props().content
      ).toEqual(SURICATA_SIGNATURE_ID_FIELD_NAME);
    });
  });
});
