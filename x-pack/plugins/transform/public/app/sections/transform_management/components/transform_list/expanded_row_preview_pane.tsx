/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState, type FC } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DataGrid } from '@kbn/ml-data-grid';

import { useToastNotifications } from '../../../../app_dependencies';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';
import { useSearchItems } from '../../../../hooks/use_search_items';
import { TransformListRow } from '../../../../common';

import { WizardContext } from '../../../create_transform/components/wizard';

import { getTransformWizardStore } from '../../../create_transform/state_management/create_transform_store';

import { useInitializeTransformWizardState } from '../../../create_transform/components/wizard/wizard_steps';

interface ExpandedRowPreviewPaneProps {
  item: TransformListRow;
}

export const ExpandedRowPreviewPane: FC<ExpandedRowPreviewPaneProps> = ({ item }) => {
  const {
    error: searchItemsError,
    loadDataViewByEsIndexPattern,
    searchItems,
  } = useSearchItems(undefined);

  const [errorMessage, setErrorMessage] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeSearchItems() {
      const { dataViewId, dataViewTitle } = await loadDataViewByEsIndexPattern(
        item.config.source.index
      );

      if (dataViewId === undefined) {
        setErrorMessage(
          i18n.translate('xpack.transformList.preview.noDataViewErrorPromptText', {
            defaultMessage:
              'Unable to preview the transform {transformId}. No data view exists for {dataViewTitle}.',
            values: { dataViewTitle, transformId: item.id },
          })
        );
      }
    }

    initializeSearchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchItemsError !== undefined) {
      setErrorMessage(searchItemsError);
      setIsInitialized(true);
    }
  }, [searchItemsError]);

  useEffect(() => {
    if (searchItems !== undefined && searchItemsError === undefined) {
      setIsInitialized(true);
    }
  }, [searchItems, searchItemsError]);

  const reduxStore = useMemo(() => getTransformWizardStore(), []);

  if (errorMessage) {
    return (
      <>
        <EuiCallOut
          title={i18n.translate('xpack.transform.clone.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the transform preview.',
          })}
          color="danger"
          iconType="warning"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </>
    );
  }

  if (searchItems === undefined || !isInitialized) return null;

  return (
    <WizardContext.Provider value={{ cloneConfig: item.config, searchItems }}>
      <ReduxProvider store={reduxStore}>
        <ExpandedRowPreviewPaneDataGrid />
      </ReduxProvider>
    </WizardContext.Provider>
  );
};

export const ExpandedRowPreviewPaneDataGrid: FC = () => {
  useInitializeTransformWizardState();
  const toastNotifications = useToastNotifications();
  const pivotPreviewProps = useTransformConfigData();

  return (
    <DataGrid
      {...pivotPreviewProps}
      dataTestSubj="transformPivotPreview"
      toastNotifications={toastNotifications}
    />
  );
};
