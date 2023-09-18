/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useRef, Fragment } from 'react';
import { EuiPageBody, EuiPanel, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { useMlKibana, useNavigateToPath } from '../../../../contexts/kibana';
import { MlPageHeader } from '../../../../components/page_header';

export interface PageProps {
  nextStepPath: string;
}

export const Page: FC<PageProps> = ({ nextStepPath }) => {
  const RESULTS_PER_PAGE = 20;
  const { contentManagement, uiSettings, dataViewEditor } = useMlKibana().services;
  const navigateToPath = useNavigateToPath();
  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const closeDataViewEditor = useRef<() => void | undefined>();

  const onObjectSelection = useCallback(
    (id: string, type: string) => {
      navigateToPath(
        `${nextStepPath}?${
          type === 'index-pattern' ? 'index' : 'savedSearchId'
        }=${encodeURIComponent(id)}`
      );
    },
    [navigateToPath, nextStepPath]
  );

  const createNewDataView = useCallback(() => {
    closeDataViewEditor.current = dataViewEditor?.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          onObjectSelection(dataView.id, 'index-pattern');
        }
      },

      allowAdHocDataView: false,
    });
  }, [onObjectSelection, dataViewEditor]);

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.selectDataViewOrSavedSearch"
            defaultMessage="Select data view or saved search"
          />
        </MlPageHeader>
        <EuiPanel hasShadow={false} hasBorder>
          <SavedObjectFinder
            key="searchSavedObjectFinder"
            onChoose={onObjectSelection}
            showFilter
            noItemsMessage={i18n.translate('xpack.ml.newJob.wizard.searchSelection.notFoundLabel', {
              defaultMessage: 'No matching data views or saved searches found.',
            })}
            savedObjectMetaData={[
              {
                type: 'search',
                getIconForSavedObject: () => 'search',
                name: i18n.translate(
                  'xpack.ml.newJob.wizard.searchSelection.savedObjectType.search',
                  {
                    defaultMessage: 'Saved search',
                  }
                ),
              },
              {
                type: 'index-pattern',
                getIconForSavedObject: () => 'indexPatternApp',
                name: i18n.translate(
                  'xpack.ml.newJob.wizard.searchSelection.savedObjectType.dataView',
                  {
                    defaultMessage: 'Data view',
                  }
                ),
              },
            ]}
            fixedPageSize={RESULTS_PER_PAGE}
            services={{
              contentClient: contentManagement.client,
              uiSettings,
            }}
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
                  id="xpack.ml.savedObjectFinder.createADataView"
                  defaultMessage="Create a data view"
                />
              </EuiButton>
            ) : (
              <Fragment />
            )}
          </SavedObjectFinder>
        </EuiPanel>
      </EuiPageBody>
    </div>
  );
};
