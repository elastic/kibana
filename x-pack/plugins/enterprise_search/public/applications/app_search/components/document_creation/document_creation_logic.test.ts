/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    describe('showCreationModes', () => {
      beforeAll(() => {
        mount();
        DocumentCreationLogic.actions.showCreationModes();
      });

      const EXPECTED_VALUES = {
        ...DEFAULT_VALUES,
        isDocumentCreationOpen: true,
        creationStep: DocumentCreationStep.ShowCreationModes,
      };

      describe('isDocumentCreationOpen', () => {
        it('should be set to true', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            isDocumentCreationOpen: true,
          });
        });
      });

      describe('creationStep', () => {
        it('should be set to ShowCreationModes', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            creationStep: DocumentCreationStep.ShowCreationModes,
          });
        });
      });
    });

    describe('openDocumentCreation', () => {
      beforeAll(() => {
        mount();
        DocumentCreationLogic.actions.openDocumentCreation('api');
      });

      const EXPECTED_VALUES = {
        ...DEFAULT_VALUES,
        isDocumentCreationOpen: true,
        creationStep: DocumentCreationStep.AddDocuments,
        creationMode: 'api',
      };

      describe('isDocumentCreationOpen', () => {
        it('should be set to true', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            isDocumentCreationOpen: true,
          });
        });
      });

      describe('creationStep', () => {
        it('should be set to AddDocuments', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
            creationStep: DocumentCreationStep.AddDocuments,
          });
        });
      });

      describe('creationMode', () => {
        it('should be set to the provided value', () => {
          expect(DocumentCreationLogic.values).toEqual({
            ...EXPECTED_VALUES,
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
            creationStep: 3,
          });
        });
      });
    });
  });
});
