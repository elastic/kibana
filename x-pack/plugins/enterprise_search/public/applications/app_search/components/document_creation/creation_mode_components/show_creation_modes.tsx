/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import {
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';

import { MODAL_CANCEL_BUTTON } from '../constants';
import { DocumentCreationLogic, DocumentCreationButtons } from '../';

export const ShowCreationModes: React.FC = () => {
  const { closeDocumentCreation } = useActions(DocumentCreationLogic);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.showCreationModes.title',
              { defaultMessage: 'Add new documents' }
            )}
          </h2>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <DocumentCreationButtons />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeDocumentCreation}>{MODAL_CANCEL_BUTTON}</EuiButtonEmpty>
      </EuiModalFooter>
    </>
  );
};
