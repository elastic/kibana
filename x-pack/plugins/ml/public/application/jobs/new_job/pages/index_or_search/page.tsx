/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiPageBody, EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinderUi } from '../../../../../../../../../src/plugins/saved_objects/public';
import { useMlKibana, useNavigateToPath } from '../../../../contexts/kibana';
import { MlPageHeader } from '../../../../components/page_header';

export interface PageProps {
  nextStepPath: string;
}

export const Page: FC<PageProps> = ({ nextStepPath }) => {
  const RESULTS_PER_PAGE = 20;
  const { uiSettings, savedObjects } = useMlKibana().services;
  const navigateToPath = useNavigateToPath();

  const onObjectSelection = (id: string, type: string) => {
    navigateToPath(
      `${nextStepPath}?${type === 'index-pattern' ? 'index' : 'savedSearchId'}=${encodeURIComponent(
        id
      )}`
    );
  };

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.selectDataViewOrSavedSearch"
            defaultMessage="Select data view or saved search"
          />
        </MlPageHeader>
        <EuiPageContent hasShadow={false} hasBorder={true}>
          <SavedObjectFinderUi
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
            uiSettings={uiSettings}
            savedObjects={savedObjects}
          />
        </EuiPageContent>
      </EuiPageBody>
    </div>
  );
};
