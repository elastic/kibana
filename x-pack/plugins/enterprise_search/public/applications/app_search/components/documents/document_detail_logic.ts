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
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_DOCUMENTS_PATH, getEngineRoute } from '../../routes';

interface DocumentDetailLogicValues {
  dataLoading: boolean;
  fields: FieldDetails[];
}

interface DocumentDetailLogicActions {
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
    setFields: (fields) => ({ fields }),
    getDocumentDetails: (documentId) => ({ documentId }),
    deleteDocument: (documentId) => ({ documentId }),
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
        const response = await http.get(
          `/api/app_search/engines/${engineName}/documents/${documentId}`
        );
        actions.setFields(response.fields);
      } catch (e) {
        // If an error occurs trying to load this document, it will typically be a 404, or some other
        // error that will prevent the page from loading, so redirect to the documents page and
        // show the error
        flashAPIErrors(e, { isQueued: true });
        const engineRoute = getEngineRoute(engineName);
        KibanaLogic.values.navigateToUrl(engineRoute + ENGINE_DOCUMENTS_PATH);
      }
    },
    deleteDocument: async ({ documentId }) => {
      const { engineName } = EngineLogic.values;

      if (window.confirm(CONFIRM_DELETE)) {
        try {
          const { http } = HttpLogic.values;
          await http.delete(`/api/app_search/engines/${engineName}/documents/${documentId}`);
          setQueuedSuccessMessage(DELETE_SUCCESS);
          const engineRoute = getEngineRoute(engineName);
          KibanaLogic.values.navigateToUrl(engineRoute + ENGINE_DOCUMENTS_PATH);
        } catch (e) {
          flashAPIErrors(e);
        }
      }
    },
  }),
});
