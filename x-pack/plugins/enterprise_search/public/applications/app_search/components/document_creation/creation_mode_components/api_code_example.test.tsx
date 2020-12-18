/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/enterprise_search_url.mock';
import { setMockValues, setMockActions } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiCode, EuiCodeBlock, EuiButtonEmpty } from '@elastic/eui';

import { ApiCodeExample, ModalHeader, ModalBody, ModalFooter } from './api_code_example';

describe('ApiCodeExample', () => {
  const values = {
    engineName: 'test-engine',
    engine: { apiKey: 'test-key' },
  };
  const actions = {
    closeDocumentCreation: jest.fn(),
  };

  beforeAll(() => {
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<ApiCodeExample />);
    expect(wrapper.find(ModalHeader)).toHaveLength(1);
    expect(wrapper.find(ModalBody)).toHaveLength(1);
    expect(wrapper.find(ModalFooter)).toHaveLength(1);
  });

  describe('ModalHeader', () => {
    it('renders', () => {
      const wrapper = shallow(<ModalHeader />);
      expect(wrapper.find('h2').text()).toEqual('Indexing by API');
    });
  });

  describe('ModalBody', () => {
    let wrapper: ShallowWrapper;

    beforeAll(() => {
      wrapper = shallow(<ModalBody />);
    });

    it('renders with the full remote Enterprise Search API URL', () => {
      expect(wrapper.find(EuiCode).dive().dive().text()).toEqual(
        'http://localhost:3002/api/as/v1/engines/test-engine/documents'
      );
      expect(wrapper.find(EuiCodeBlock).dive().dive().text()).toEqual(
        expect.stringContaining('http://localhost:3002/api/as/v1/engines/test-engine/documents')
      );
    });

    it('renders with the API key', () => {
      expect(wrapper.find(EuiCodeBlock).dive().dive().text()).toEqual(
        expect.stringContaining('test-key')
      );
    });
  });

  describe('ModalFooter', () => {
    it('closes the modal', () => {
      const wrapper = shallow(<ModalFooter />);

      wrapper.find(EuiButtonEmpty).simulate('click');
      expect(actions.closeDocumentCreation).toHaveBeenCalled();
    });
  });
});
