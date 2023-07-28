/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, FC, useCallback, useContext, useEffect, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAiopsAppContext } from './use_aiops_app_context';

export const DataSourceContext = createContext<DataViewAndSavedSearch>({
  get dataView(): never {
    throw new Error('DataSourceContext is not implemented');
  },
  savedSearch: null,
});

export function useDataSource() {
  return useContext(DataSourceContext);
}

export interface DataViewAndSavedSearch {
  savedSearch: SavedSearch | null;
  dataView: DataView;
}

/**
 * Context provider that resolves current data view and the saved search
 *
 * @param children
 * @constructor
 */
export const DataSourceContextProvider: FC<{ dataViewId?: string; savedSearchId?: string }> = ({
  dataViewId,
  savedSearchId,
  children,
}) => {
  const [value, setValue] = useState<DataViewAndSavedSearch>();
  const [error, setError] = useState<Error>();

  const {
    data: { dataViews },
    // uiSettings,
    // savedSearch: savedSearchService,
  } = useAiopsAppContext();

  /**
   * Resolve data view or saved search if exists.
   */
  const resolveDataSource = useCallback(async (): Promise<DataViewAndSavedSearch> => {
    if (dataViewId === '') {
      throw new Error(
        i18n.translate('xpack.ml.useResolver.errorIndexPatternIdEmptyString', {
          defaultMessage: 'dataViewId must not be empty string.',
        })
      );
    }

    const dataViewAndSavedSearch: DataViewAndSavedSearch = {
      savedSearch: null,
      // @ts-ignore
      dataView: null,
    };

    // support only data views for now
    if (dataViewId !== undefined) {
      dataViewAndSavedSearch.dataView = await dataViews.get(dataViewId);
    }

    const { savedSearch, dataView } = dataViewAndSavedSearch;

    return {
      dataView,
      savedSearch,
    };
  }, [dataViewId, dataViews]);

  useEffect(() => {
    resolveDataSource()
      .then((result) => {
        setValue(result);
      })
      .catch((e) => {
        setError(e);
      });
  }, [resolveDataSource]);

  if (!value && !error) return null;

  if (error) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ml.dataSourceContext.errorTitle"
              defaultMessage="Unable to fetch data view or saved search"
            />
          </h2>
        }
        body={<p>{error.message}</p>}
      />
    );
  }

  return <DataSourceContext.Provider value={value!}>{children}</DataSourceContext.Provider>;
};
