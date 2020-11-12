/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';
import { EngineLogic } from '../engine';
import { flashAPIErrors, setQueuedSuccessMessage } from '../../../shared/flash_messages';
import { FieldDetails } from './types';

export interface DocumentDetailLogicValues {
  dataLoading: boolean;
  fields: FieldDetails[];
}

export interface DocumentDetailLogicActions {
  setFields(fields: FieldDetails[]): { fields: FieldDetails[] };
  deleteDocument(documentId: string): { documentId: string };
  getDocumentDetails(documentId: string): { documentId: string };
}

type DocumentDetailLogicType = MakeLogicType<DocumentDetailLogicValues, DocumentDetailLogicActions>;

const CONFIRM_DELETE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentDetail.confirmDelete',
  {
    defaultMessage: 'Are you sure you want to delete this document?',
  }
);
const DELETE_SUCCESS = i18n.translate(
  'xpack.enterpriseSearch.appSearch.documentDetail.deleteSuccess',
  {
    defaultMessage: 'Successfully marked document for deletion. It will be deleted momentarily.',
  }
);

export const DocumentDetailLogic = kea<DocumentDetailLogicType>({
  path: ['enterprise_search', 'app_search', 'document_detail_logic'],
  actions: () => ({
    setFields: (fields: FieldDetails[]) => ({ fields }),
    getDocumentDetails: (documentId: string) => ({ documentId }),
    deleteDocument: (documentId: string) => ({ documentId }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        setFields: () => false,
      },
    ],
    fields: [
      [],
      {
        setFields: (_, { fields }) => fields,
      },
    ],
  }),
  listeners: ({ actions }) => ({
    getDocumentDetails: async ({ documentId }) => {
      const { engineName } = EngineLogic.values;

      try {
        const { http } = HttpLogic.values;
        // TODO: Handle 404s
        const response = await http.get(
          `/api/app_search/engines/${engineName}/documents/${documentId}`
        );
        actions.setFields(response.fields);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteDocument: async ({ documentId }) => {
      const { engineName } = EngineLogic.values;

      if (window.confirm(CONFIRM_DELETE)) {
        try {
          const { http } = HttpLogic.values;
          await http.delete(`/api/app_search/engines/${engineName}/documents/${documentId}`);
          setQueuedSuccessMessage(DELETE_SUCCESS);
          // TODO Handle routing after success
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
  }),
});
