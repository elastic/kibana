/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { EuiPageBody, EuiPageSection, EuiButton, EuiPanel } from '@elastic/eui';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { type DataViewEditorService as DataViewEditorServiceSpec } from '@kbn/data-view-editor-plugin/public';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { createPath } from '../../routing/router';
import { ML_PAGES } from '../../../../common/constants/locator';
import { DataDriftIndexPatternsEditor } from './data_drift_index_patterns_editor';

import { MlPageHeader } from '../../components/page_header';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

export const DataDriftIndexOrSearchRedirect: FC = () => {
  const navigateToPath = useNavigateToPath();
  const { contentManagement, uiSettings } = useMlKibana().services;
  const {
    services: { dataViewEditor },
  } = useMlKibana();

  const nextStepPath = '/data_drift';
  const onObjectSelection = (id: string, type: string) => {
    navigateToPath(
      `${nextStepPath}?${type === 'index-pattern' ? 'index' : 'savedSearchId'}=${encodeURIComponent(
        id
      )}`
    );
  };

  const canEditDataView = dataViewEditor?.userPermissions.editDataView();

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
            id="mlDataDriftDataViewsPicker"
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
                  // ES|QL Based saved searches are not supported in Data Drift, filter them out
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
            fixedPageSize={20}
            services={{
              contentClient: contentManagement.client,
              uiSettings,
            }}
          >
            <EuiButton
              size="m"
              fill
              iconType="plusInCircleFilled"
              onClick={() => navigateToPath(createPath(ML_PAGES.DATA_DRIFT_CUSTOM))}
              disabled={!canEditDataView}
              data-test-subj={'dataDriftCreateDataViewButton'}
            >
              <FormattedMessage
                id="xpack.ml.dataDrift.createDataViewButton"
                defaultMessage="Create a data view"
              />
            </EuiButton>
          </SavedObjectFinder>
        </EuiPanel>
      </EuiPageBody>
    </div>
  );
};

export const DataDriftIndexPatternsPicker: FC = () => {
  const { reference, comparison } = parse(location.search, {
    sort: false,
  }) as { reference: string; comparison: string };

  const [dataViewEditorServices, setDataViewEditorServices] = useState<
    | {
        referenceDataViewEditorService: DataViewEditorServiceSpec;
        comparisonDataViewEditorService: DataViewEditorServiceSpec;
      }
    | undefined
  >();

  const {
    services: {
      dataViewEditor,
      http,
      data: { dataViews },
    },
  } = useMlKibana();
  const { dataViewEditorServiceFactory } = dataViewEditor;

  const initialComparisonIndexPattern = useMemo(
    () => (comparison ? comparison.replaceAll(`'`, '') : ''),
    [comparison]
  );
  const initialReferenceIndexPattern = useMemo(
    () => (reference ? reference.replaceAll(`'`, '') : ''),
    [reference]
  );

  useEffect(() => {
    let unmounted = false;
    const getDataViewEditorService = async () => {
      if (http && dataViews && dataViewEditorServiceFactory) {
        const { DataViewEditorService } = await dataViewEditorServiceFactory();
        const referenceDataViewEditorService = new DataViewEditorService({
          // @ts-expect-error Mismatch in DataViewsServicePublic import, but should be same
          services: { http, dataViews },
          initialValues: {
            name: '',
            type: INDEX_PATTERN_TYPE.DEFAULT,
            indexPattern: initialReferenceIndexPattern,
          },
          requireTimestampField: false,
        });
        const comparisonDataViewEditorService = new DataViewEditorService({
          // @ts-expect-error Mismatch in DataViewsServicePublic import, but should be same
          services: { http, dataViews },
          initialValues: {
            name: '',
            type: INDEX_PATTERN_TYPE.DEFAULT,
            indexPattern: initialComparisonIndexPattern,
          },
          requireTimestampField: false,
        });
        if (!unmounted) {
          setDataViewEditorServices({
            referenceDataViewEditorService,
            comparisonDataViewEditorService,
          });
        }
      }
    };
    getDataViewEditorService();

    return () => {
      unmounted = true;
    };
  }, [
    dataViewEditorServiceFactory,
    http,
    dataViews,
    initialReferenceIndexPattern,
    initialComparisonIndexPattern,
  ]);

  return (
    <div data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <MlPageHeader>
          <FormattedMessage
            id="xpack.ml.dataDrift.createDataDriftDataViewTitle"
            defaultMessage="Create data view and analyze data drift"
          />
        </MlPageHeader>
        <EuiPageSection>
          {dataViewEditorServices ? (
            <DataDriftIndexPatternsEditor
              initialComparisonIndexPattern={initialComparisonIndexPattern}
              initialReferenceIndexPattern={initialReferenceIndexPattern}
              referenceDataViewEditorService={dataViewEditorServices.referenceDataViewEditorService}
              comparisonDataViewEditorService={
                dataViewEditorServices.comparisonDataViewEditorService
              }
            />
          ) : null}
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
