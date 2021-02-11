/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiModal, EuiModalBody } from '@elastic/eui';

import { DocumentCreationStep } from './types';
import { DocumentCreationModal, DocumentCreationButtons } from './';

describe('DocumentCreationModal', () => {
  const values = {
    isDocumentCreationOpen: true,
    creationMode: 'text',
    creationStep: DocumentCreationStep.AddDocuments,
  };
  const actions = {
    closeDocumentCreation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a closeable modal', () => {
    const wrapper = shallow(<DocumentCreationModal />);
    expect(wrapper.find(EuiModal)).toHaveLength(1);

    wrapper.find(EuiModal).prop('onClose')();
    expect(actions.closeDocumentCreation).toHaveBeenCalled();
  });

  it('does not render if isDocumentCreationOpen is false', () => {
    setMockValues({ ...values, isDocumentCreationOpen: false });
    const wrapper = shallow(<DocumentCreationModal />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('modal content', () => {
    it('renders document creation mode buttons', () => {
      setMockValues({ ...values, creationStep: DocumentCreationStep.ShowCreationModes });
      const wrapper = shallow(<DocumentCreationModal />);

      expect(wrapper.find(DocumentCreationButtons)).toHaveLength(1);
    });

    describe('creation modes', () => {
      it('renders ApiCodeExample', () => {
        setMockValues({ ...values, creationMode: 'api' });
        const wrapper = shallow(<DocumentCreationModal />);

        expect(wrapper.find(EuiModalBody).dive().text()).toBe('ApiCodeExample'); // TODO: actual component
      });

      it('renders PasteJsonText', () => {
        setMockValues({ ...values, creationMode: 'text' });
        const wrapper = shallow(<DocumentCreationModal />);

        expect(wrapper.find(EuiModalBody).dive().text()).toBe('PasteJsonText'); // TODO: actual component
      });

      it('renders UploadJsonFile', () => {
        setMockValues({ ...values, creationMode: 'file' });
        const wrapper = shallow(<DocumentCreationModal />);

        expect(wrapper.find(EuiModalBody).dive().text()).toBe('UploadJsonFile'); // TODO: actual component
      });
    });

    describe('creation steps', () => {
      it('renders an error page', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowError });
        const wrapper = shallow(<DocumentCreationModal />);

        expect(wrapper.find(EuiModalBody).dive().text()).toBe('DocumentCreationError'); // TODO: actual component
      });

      it('renders an error summary', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowErrorSummary });
        const wrapper = shallow(<DocumentCreationModal />);

        expect(wrapper.find(EuiModalBody).dive().text()).toBe('DocumentCreationSummary'); // TODO: actual component
      });

      it('renders a success summary', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowSuccessSummary });
        const wrapper = shallow(<DocumentCreationModal />);

        // TODO: Figure out if the error and success summary should remain the same vs different components
        expect(wrapper.find(EuiModalBody).dive().text()).toBe('DocumentCreationSummary'); // TODO: actual component
      });
    });
  });
});
