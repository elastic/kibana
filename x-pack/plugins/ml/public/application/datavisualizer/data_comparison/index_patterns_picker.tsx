/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiPageBody,
  EuiPageSection,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { createPath } from '../../routing/router';
import { ML_PAGES } from '../../../../common/constants/locator';
import { DataDriftIndexPatternsEditor } from './data_drift_index_patterns_editor';
import { MlPageHeader } from '../../components/page_header';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

export const DataDriftIndexOrSearchRedirect: FC = () => {
  const navigateToPath = useNavigateToPath();
  const { contentManagement, uiSettings } = useMlKibana().services;

  const nextStepPath = '/data_drift';
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
        <>
          <MlPageHeader>
            <EuiFlexGroup>
              <EuiFlexItem grow={true}>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.selectDataViewOrSavedSearch"
                  defaultMessage="Select data view or saved search"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('xpack.ml.dataDrift.customizeIndexPatternsTooltip', {
                    defaultMessage: 'Customize index patterns',
                  })}
                >
                  <EuiButton onClick={() => navigateToPath(createPath(ML_PAGES.DATA_DRIFT_CUSTOM))}>
                    <FormattedMessage
                      id="xpack.ml.dataDrift.customizeIndexPatternsButton"
                      defaultMessage="Customize"
                    />
                  </EuiButton>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </MlPageHeader>
          <EuiPageSection>
            <SavedObjectFinder
              key="searchSavedObjectFinder"
              onChoose={onObjectSelection}
              showFilter
              noItemsMessage={i18n.translate(
                'xpack.ml.newJob.wizard.searchSelection.notFoundLabel',
                {
                  defaultMessage: 'No matching data views or saved searches found.',
                }
              )}
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
              fixedPageSize={20}
              services={{
                contentClient: contentManagement.client,
                uiSettings,
              }}
            />
          </EuiPageSection>
        </>
      </EuiPageBody>
    </div>
  );
};

export const DataDriftIndexPatternsPicker: FC = () => {
  const { sourceIp, destIp } = parse(location.search, {
    sort: false,
  }) as { sourceIp: string; destIp: string };

  const initialProductionIndexPattern = destIp ? destIp.replaceAll(`'`, '') : '';
  const initialReferenceIndexPattern = sourceIp ? sourceIp.replaceAll(`'`, '') : '';

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.selectIndexPatterns"
            defaultMessage="Specify index patterns"
          />
        </MlPageHeader>
        <EuiPageSection>
          <DataDriftIndexPatternsEditor
            initialProductionIndexPattern={initialProductionIndexPattern}
            initialReferenceIndexPattern={initialReferenceIndexPattern}
          />
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
