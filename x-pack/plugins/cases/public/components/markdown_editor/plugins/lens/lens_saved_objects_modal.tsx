/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalProps,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';

import {
  SavedObjectFinderUi,
  SavedObjectFinderUiProps,
} from '../../../../../../../../src/plugins/saved_objects/public';
import { useKibana } from '../../../../common/lib/kibana';
import { ModalContainer } from './modal_container';

interface LensSavedObjectsModalProps {
  onClose: EuiModalProps['onClose'];
  onChoose: SavedObjectFinderUiProps['onChoose'];
}

const LensSavedObjectsModalComponent: React.FC<LensSavedObjectsModalProps> = ({
  onClose,
  onChoose,
}) => {
  const { savedObjects, uiSettings } = useKibana().services;

  const savedObjectMetaData = useMemo(
    () => [
      {
        type: 'lens',
        getIconForSavedObject: () => 'lensApp',
        name: i18n.translate(
          'xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.savedObjectType.lens',
          {
            defaultMessage: 'Lens',
          }
        ),
        includeFields: ['*'],
      },
    ],
    []
  );

  return (
    <EuiModal onClose={onClose}>
      <ModalContainer>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.modalTitle"
                defaultMessage="Add from library"
              />
            </h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <SavedObjectFinderUi
            key="searchSavedObjectFinder"
            onChoose={onChoose}
            showFilter
            noItemsMessage={
              <FormattedMessage
                id="xpack.cases.markdownEditor.plugins.lens.insertLensSavedObjectModal.searchSelection.notFoundLabel"
                defaultMessage="'No matching lens found."
              />
            }
            savedObjectMetaData={savedObjectMetaData}
            fixedPageSize={10}
            uiSettings={uiSettings}
            savedObjects={savedObjects}
          />
        </EuiModalBody>
      </ModalContainer>
    </EuiModal>
  );
};

export const LensSavedObjectsModal = React.memo(LensSavedObjectsModalComponent);
