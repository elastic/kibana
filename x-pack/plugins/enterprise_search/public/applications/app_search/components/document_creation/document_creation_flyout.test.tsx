/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout } from '@elastic/eui';

import {
  ShowCreationModes,
  ApiCodeExample,
  JsonFlyout,
  ElasticsearchIndex,
} from './creation_mode_components';
import { Summary } from './creation_response_components';
import { DocumentCreationFlyout, FlyoutContent } from './document_creation_flyout';
import { DocumentCreationStep } from './types';

describe('DocumentCreationFlyout', () => {
  const values = {
    isDocumentCreationOpen: true,
    creationMode: 'api',
    creationStep: DocumentCreationStep.AddDocuments,
  };
  const actions = {
    closeDocumentCreation: jest.fn(),
    setActiveJsonTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a closeable flyout', () => {
    const wrapper = shallow(<DocumentCreationFlyout />);
    expect(wrapper.find(EuiFlyout)).toHaveLength(1);

    wrapper.find(EuiFlyout).prop('onClose')();
    expect(actions.closeDocumentCreation).toHaveBeenCalled();
  });

  it('does not render if isDocumentCreationOpen is false', () => {
    setMockValues({ ...values, isDocumentCreationOpen: false });
    const wrapper = shallow(<DocumentCreationFlyout />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('FlyoutContent', () => {
    it('renders ShowCreationModes', () => {
      setMockValues({ ...values, creationStep: DocumentCreationStep.ShowCreationModes });
      const wrapper = shallow(<FlyoutContent />);

      expect(wrapper.find(ShowCreationModes)).toHaveLength(1);
    });

    describe('creation modes', () => {
      it('renders ApiCodeExample', () => {
        setMockValues({ ...values, creationMode: 'api' });
        const wrapper = shallow(<FlyoutContent />);

        expect(wrapper.find(ApiCodeExample)).toHaveLength(1);
      });

      it('renders JsonFlyout', () => {
        setMockValues({ ...values, creationMode: 'json' });
        const wrapper = shallow(<FlyoutContent />);

        expect(wrapper.find(JsonFlyout)).toHaveLength(1);
      });

      it('renders ElasticsearchIndex', () => {
        setMockValues({ ...values, creationMode: 'elasticsearchIndex' });
        const wrapper = shallow(<FlyoutContent />);

        expect(wrapper.find(ElasticsearchIndex)).toHaveLength(1);
      });
    });

    it('renders a summary', () => {
      setMockValues({ ...values, creationStep: DocumentCreationStep.ShowSummary });
      const wrapper = shallow(<FlyoutContent />);

      expect(wrapper.find(Summary)).toHaveLength(1);
    });
  });
});
