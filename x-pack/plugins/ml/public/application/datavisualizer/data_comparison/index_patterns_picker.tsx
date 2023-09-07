/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useMemo } from 'react';
import {
  EuiPageBody,
  EuiPageSection,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { type DataViewEditorService as DataViewEditorServiceSpec } from '@kbn/data-view-editor-plugin/public';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
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
            </EuiFlexGroup>
          </MlPageHeader>
          <EuiPanel hasShadow={false} hasBorder>
            <SavedObjectFinder
              leftChildren={
                <EuiButton
                  size="m"
                  color="primary"
                  iconType="plusInCircleFilled"
                  onClick={() => navigateToPath(createPath(ML_PAGES.DATA_DRIFT_CUSTOM))}
                >
                  <FormattedMessage
                    id="xpack.ml.dataDrift.customizeIndexPatternsButton"
                    defaultMessage="Create a data view"
                  />
                </EuiButton>
              }
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
          </EuiPanel>
        </>
      </EuiPageBody>
    </div>
  );
};

export const DataDriftIndexPatternsPicker: FC = () => {
  const { sourceIp, destIp } = parse(location.search, {
    sort: false,
  }) as { sourceIp: string; destIp: string };

  const [dataViewEditorServices, setDataViewEditorServices] = useState<
    | {
        referenceDataViewEditorService: DataViewEditorServiceSpec;
        productionDataViewEditorService: DataViewEditorServiceSpec;
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

  const initialProductionIndexPattern = useMemo(
    () => (destIp ? destIp.replaceAll(`'`, '') : ''),
    [destIp]
  );
  const initialReferenceIndexPattern = useMemo(
    () => (sourceIp ? sourceIp.replaceAll(`'`, '') : ''),
    [sourceIp]
  );

  useEffect(() => {
    let unmounted = false;
    const getDataViewEditorService = async () => {
      if (!unmounted && http && dataViews && dataViewEditorServiceFactory) {
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
        const productionDataViewEditorService = new DataViewEditorService({
          // @ts-expect-error Mismatch in DataViewsServicePublic import, but should be same
          services: { http, dataViews },
          initialValues: {
            name: '',
            type: INDEX_PATTERN_TYPE.DEFAULT,
            indexPattern: initialProductionIndexPattern,
          },
          requireTimestampField: false,
        });
        setDataViewEditorServices({
          referenceDataViewEditorService,
          productionDataViewEditorService,
        });
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
    initialProductionIndexPattern,
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
              initialProductionIndexPattern={initialProductionIndexPattern}
              initialReferenceIndexPattern={initialReferenceIndexPattern}
              referenceDataViewEditorService={dataViewEditorServices.referenceDataViewEditorService}
              productionDataViewEditorService={
                dataViewEditorServices.productionDataViewEditorService
              }
            />
          ) : null}
        </EuiPageSection>
      </EuiPageBody>
    </div>
  );
};
