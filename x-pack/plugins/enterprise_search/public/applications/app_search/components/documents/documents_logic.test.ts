/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../__mocks__/kea.mock';

import { DocumentsLogic } from './documents_logic';

describe('DocumentsLogic', () => {
  const DEFAULT_VALUES = {
    isDocumentCreationOpen: false,
  };

  const { mount } = new LogicMounter(DocumentsLogic);

  describe('actions', () => {
    describe('openDocumentCreation', () => {
      it('should toggle isDocumentCreationOpen to true', () => {
        mount({
          isDocumentCreationOpen: false,
        });

        DocumentsLogic.actions.openDocumentCreation();

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isDocumentCreationOpen: true,
        });
      });
    });

    describe('closeDocumentCreation', () => {
      it('should toggle isDocumentCreationOpen to false', () => {
        mount({
          isDocumentCreationOpen: true,
        });

        DocumentsLogic.actions.closeDocumentCreation();

        expect(DocumentsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isDocumentCreationOpen: false,
        });
      });
    });
  });
});
