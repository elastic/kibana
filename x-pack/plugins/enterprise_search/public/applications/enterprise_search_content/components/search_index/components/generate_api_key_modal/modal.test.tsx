/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiModal, EuiFieldText } from '@elastic/eui';

const mockActions = { makeRequest: jest.fn(), setKeyName: jest.fn() };

const mockValues = { apiKey: '', isLoading: false, isSuccess: false, keyName: '' };

import { ApiKey } from '../../../api_key/api_key';

import { GenerateApiKeyModal } from './modal';

const onCloseMock = jest.fn();
describe('GenerateApiKeyModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(mockValues);
    setMockActions(mockActions);
  });

  it('renders the empty modal', () => {
    const wrapper = shallow(
      <GenerateApiKeyModal indexName="test-index-123" onClose={onCloseMock} />
    );
    expect(wrapper.find(EuiModal)).toHaveLength(1);

    wrapper.find(EuiModal).prop('onClose')();
    expect(onCloseMock).toHaveBeenCalled();
  });

  describe('Modal content', () => {
    it('renders API key name form', () => {
      const wrapper = shallow(
        <GenerateApiKeyModal indexName="test-index-123" onClose={onCloseMock} />
      );
      expect(wrapper.find(EuiFieldText)).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="generateApiKeyButton"]')).toHaveLength(1);
    });

    it('sets keyName name on form', () => {
      const wrapper = shallow(
        <GenerateApiKeyModal indexName="test-index-123" onClose={onCloseMock} />
      );
      const textField = wrapper.find(EuiFieldText);
      expect(textField).toHaveLength(1);
      textField.simulate('change', { currentTarget: { value: 'changeEvent-key-name' } });
      expect(mockActions.setKeyName).toHaveBeenCalledWith('changeEvent-key-name');
    });

    it('should trigger api call from the form', () => {
      setMockValues({ ...mockValues, indexName: 'test-123', keyName: '    with-spaces    ' });
      const wrapper = shallow(
        <GenerateApiKeyModal indexName="test-index-123" onClose={onCloseMock} />
      );
      expect(wrapper.find(EuiFieldText)).toHaveLength(1);
      wrapper.find('[data-test-subj="generateApiKeyButton"]').simulate('click');

      expect(mockActions.makeRequest).toHaveBeenCalledWith({
        indexName: 'test-index-123',
        keyName: 'with-spaces',
      });
    });
    it('renders created API key results', () => {
      setMockValues({
        ...mockValues,
        apiKey: 'apiKeyFromBackend123123==',
        indexName: 'test-123',
        isSuccess: true,
        keyName: 'keyname',
      });
      const wrapper = shallow(
        <GenerateApiKeyModal indexName="test-index-123" onClose={onCloseMock} />
      );
      expect(wrapper.find(EuiFieldText)).toHaveLength(0);
      expect(wrapper.find('[data-test-subj="generateApiKeyButton"]')).toHaveLength(0);
      expect(wrapper.find(ApiKey)).toHaveLength(1);
      expect(wrapper.find(ApiKey).prop('apiKey')).toEqual('apiKeyFromBackend123123==');
    });
  });
});
