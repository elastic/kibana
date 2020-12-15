/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiModal } from '@elastic/eui';

import {
  ShowCreationModes,
  ApiCodeExample,
  PasteJsonText,
  UploadJsonFile,
} from './creation_mode_components';
import { DocumentCreationStep } from './types';

import { DocumentCreationModal, ModalContent } from './document_creation_modal';

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

  describe('ModalContent', () => {
    it('renders ShowCreationModes', () => {
      setMockValues({ ...values, creationStep: DocumentCreationStep.ShowCreationModes });
      const wrapper = shallow(<ModalContent />);

      expect(wrapper.find(ShowCreationModes)).toHaveLength(1);
    });

    describe('creation modes', () => {
      it('renders ApiCodeExample', () => {
        setMockValues({ ...values, creationMode: 'api' });
        const wrapper = shallow(<ModalContent />);

        expect(wrapper.find(ApiCodeExample)).toHaveLength(1);
      });

      it('renders PasteJsonText', () => {
        setMockValues({ ...values, creationMode: 'text' });
        const wrapper = shallow(<ModalContent />);

        expect(wrapper.find(PasteJsonText)).toHaveLength(1);
      });

      it('renders UploadJsonFile', () => {
        setMockValues({ ...values, creationMode: 'file' });
        const wrapper = shallow(<ModalContent />);

        expect(wrapper.find(UploadJsonFile)).toHaveLength(1);
      });
    });

    describe('creation steps', () => {
      it('renders an error page', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowError });
        const wrapper = shallow(<ModalContent />);

        expect(wrapper.text()).toBe('DocumentCreationError'); // TODO: actual component
      });

      it('renders an error summary', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowErrorSummary });
        const wrapper = shallow(<ModalContent />);

        expect(wrapper.text()).toBe('DocumentCreationSummary'); // TODO: actual component
      });

      it('renders a success summary', () => {
        setMockValues({ ...values, creationStep: DocumentCreationStep.ShowSuccessSummary });
        const wrapper = shallow(<ModalContent />);

        // TODO: Figure out if the error and success summary should remain the same vs different components
        expect(wrapper.text()).toBe('DocumentCreationSummary'); // TODO: actual component
      });
    });
  });
});
