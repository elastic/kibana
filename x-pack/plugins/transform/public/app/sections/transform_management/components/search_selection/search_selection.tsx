/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type FC, Fragment, useCallback, useEffect, useRef } from 'react';

import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { useAppDependencies } from '../../../../app_dependencies';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  onCloseModal: () => void;
}

const fixedPageSize: number = 8;

export const SearchSelection: FC<SearchSelectionProps> = ({ onSearchSelected, onCloseModal }) => {
  const { contentManagement, uiSettings, dataViewEditor } = useAppDependencies();

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const closeDataViewEditor = useRef<() => void | undefined>();

  const createNewDataView = useCallback(() => {
    onCloseModal();
    closeDataViewEditor.current = dataViewEditor?.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          onSearchSelected(dataView.id, 'index-pattern');
        }
      },

      allowAdHocDataView: true,
    });
  }, [dataViewEditor, onCloseModal, onSearchSelected]);

  useEffect(function cleanUpFlyout() {
    return () => {
      // Close the editor when unmounting
      if (closeDataViewEditor.current) {
        closeDataViewEditor.current();
      }
    };
  }, []);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.transform.newTransform.newTransformTitle"
            defaultMessage="New transform"
          />{' '}
          /{' '}
          <FormattedMessage
            id="xpack.transform.newTransform.chooseSourceTitle"
            defaultMessage="Choose a source"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <SavedObjectFinder
          key="searchSavedObjectFinder"
          onChoose={onSearchSelected}
          showFilter
          noItemsMessage={i18n.translate(
            'xpack.transform.newTransform.searchSelection.notFoundLabel',
            {
              defaultMessage: 'No matching indices or saved searches found.',
            }
          )}
          savedObjectMetaData={[
            {
              type: 'search',
              getIconForSavedObject: () => 'search',
              name: i18n.translate(
                'xpack.transform.newTransform.searchSelection.savedObjectType.search',
                {
                  defaultMessage: 'Saved search',
                }
              ),
            },
            {
              type: 'index-pattern',
              getIconForSavedObject: () => 'indexPatternApp',
              name: i18n.translate(
                'xpack.transform.newTransform.searchSelection.savedObjectType.dataView',
                {
                  defaultMessage: 'Data view',
                }
              ),
            },
          ]}
          fixedPageSize={fixedPageSize}
          services={{ contentClient: contentManagement.client, uiSettings }}
        >
          {canEditDataView ? (
            <EuiButton
              onClick={createNewDataView}
              fill
              iconType="plusInCircle"
              data-test-subj="newDataViewButton"
              disabled={!canEditDataView}
            >
              <FormattedMessage
                id="xpack.transform.newTransform.searchSelection.createADataView"
                defaultMessage="Create a data view"
              />
            </EuiButton>
          ) : (
            <Fragment />
          )}
        </SavedObjectFinder>
      </EuiModalBody>
    </>
  );
};
