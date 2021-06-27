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
import React from 'react';

import {
  SavedObjectFinderUi,
  SavedObjectFinderUiProps,
} from '../../../../../../../../../../../src/plugins/saved_objects/public';
import { useKibana } from '../../../../../../../utils/kibana_react';
import { ModalContainer } from './modal_container';

interface LensSavedObjectsModalProps {
  onClose: EuiModalProps['onClose'];
  onChoose: SavedObjectFinderUiProps['onChoose'];
}

// eslint-disable-next-line react/function-component-definition
const LensSavedObjectsModalComponent: React.FC<LensSavedObjectsModalProps> = ({
  onClose,
  onChoose,
}) => {
  const { savedObjects, uiSettings } = useKibana().services;

  return (
    <EuiModal onClose={onClose}>
      <ModalContainer>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>{'Modal title'}</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <SavedObjectFinderUi
            key="searchSavedObjectFinder"
            onChoose={onChoose}
            showFilter
            noItemsMessage={
              'No matching lens found.'

              // i18n.translate(
              //   'xpack.transform.newTransform.searchSelection.notFoundLabel',
              //   {
              //     defaultMessage: 'No matching lens found.',
              //   }
              // )
            }
            savedObjectMetaData={[
              {
                type: 'lens',
                getIconForSavedObject: () => 'lensApp',
                name: 'Lens',
                includeFields: ['*'],
                // i18n.translate(
                //   'xpack.transform.newTransform.searchSelection.savedObjectType.search',
                //   {
                //     defaultMessage: 'Lens',
                //   }
                // ),
              },
            ]}
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
