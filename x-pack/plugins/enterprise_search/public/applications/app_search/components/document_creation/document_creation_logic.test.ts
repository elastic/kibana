/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { DocumentCreationStep } from './types';
import { DocumentCreationLogic } from './';

describe('DocumentCreationLogic', () => {
  const DEFAULT_VALUES = {
    isDocumentCreationOpen: false,
    creationMode: 'text',
    creationStep: DocumentCreationStep.AddDocuments,
  };

  const mount = () => {
    resetContext({});
    DocumentCreationLogic.mount();
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(DocumentCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('openDocumentCreation', () => {
      describe('isDocumentCreationOpen & creationMode', () => {
        it('should open the document creation modal and sets creationMode to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.openDocumentCreation('api');

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isDocumentCreationOpen: true,
            creationMode: 'api',
          });
        });
      });
    });

    describe('closeDocumentCreation', () => {
      describe('isDocumentCreationOpen', () => {
        it('should be set to false', () => {
          mount();
          DocumentCreationLogic.actions.closeDocumentCreation();

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            isDocumentCreationOpen: false,
          });
        });
      });
    });

    describe('setCreationStep', () => {
      describe('creationStep', () => {
        it('should be set to the provided value', () => {
          mount();
          DocumentCreationLogic.actions.setCreationStep(DocumentCreationStep.ShowSuccessSummary);

          expect(DocumentCreationLogic.values).toEqual({
            ...DEFAULT_VALUES,
            creationStep: 2,
          });
        });
      });
    });
  });
});
