/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiPageBody, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { CreateDataViewButton } from '../../../../components/create_data_view_button';
import { useMlKibana, useNavigateToPath } from '../../../../contexts/kibana';
import { MlPageHeader } from '../../../../components/page_header';

export interface PageProps {
  nextStepPath: string;
}

const RESULTS_PER_PAGE = 20;

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

export const Page: FC<PageProps> = ({
  nextStepPath,
  extraButtons,
}: {
  nextStepPath: string;
  extraButtons?: React.ReactNode;
}) => {
  const { contentManagement, uiSettings } = useMlKibana().services;
  const navigateToPath = useNavigateToPath();

  const onObjectSelection = useCallback(
    (id: string, type: string, name?: string) => {
      navigateToPath(
        `${nextStepPath}?${
          type === 'index-pattern' ? 'index' : 'savedSearchId'
        }=${encodeURIComponent(id)}`
      );
    },
    [navigateToPath, nextStepPath]
  );

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
            id="mlJobsDatafeedDataView"
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
                showSavedObject: (savedObject: SavedObject) =>
                  // ES|QL Based saved searches are not supported across ML, filter them out
                  savedObject.attributes.isTextBasedQuery !== true,
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
            <EuiFlexGroup direction="row" gutterSize="s">
              <CreateDataViewButton
                onDataViewCreated={(dataView) => {
                  onObjectSelection(dataView.id!, 'index-pattern', dataView.getIndexPattern());
                }}
                allowAdHocDataView={true}
              />
              {extraButtons ? extraButtons : null}
            </EuiFlexGroup>
          </SavedObjectFinder>
        </EuiPanel>
      </EuiPageBody>
    </div>
  );
};
