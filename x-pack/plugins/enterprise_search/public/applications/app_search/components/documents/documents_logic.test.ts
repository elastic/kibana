/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { DocumentsLogic } from './documents_logic';

describe('DocumentsLogic', () => {
  const DEFAULT_VALUES = {
    isDocumentCreationOpen: false,
  };

  const mount = (defaults?: object) => {
    if (!defaults) {
      resetContext({});
    } else {
      resetContext({
        defaults: {
          enterprise_search: {
            app_search: {
              documents_logic: {
                ...defaults,
              },
            },
          },
        },
      });
    }
    DocumentsLogic.mount();
  };

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
