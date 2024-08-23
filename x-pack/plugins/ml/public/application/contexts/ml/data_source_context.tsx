/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { type FC, useCallback, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { DataViewAndSavedSearch } from '../../util/index_utils';
import { getDataViewAndSavedSearchCallback } from '../../util/index_utils';
import { useMlKibana } from '../kibana';
import { createSearchItems } from '../../jobs/new_job/utils/new_job_utils';

export interface DataSourceContextValue {
  combinedQuery: any;
  selectedDataView: DataView;
  selectedSavedSearch: SavedSearch | null;
}

export const DataSourceContext = React.createContext<DataSourceContextValue>(
  {} as DataSourceContextValue
);

/**
 * Context provider that resolves current data view and the saved search from the URL state.
 *
 * @param children
 * @constructor
 */
export const DataSourceContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [value, setValue] = useState<DataSourceContextValue>();
  const [error, setError] = useState<Error>();

  const location = useLocation();
  const {
    services: {
      data: { dataViews },
      savedSearch: savedSearchService,
      uiSettings,
    },
  } = useMlKibana();

  const { index: dataViewId, savedSearchId } = parse(location.search, {
    sort: false,
  }) as { index: string; savedSearchId: string };

  const getDataViewAndSavedSearchCb = useCallback(
    (ssId: string) =>
      getDataViewAndSavedSearchCallback({
        savedSearchService,
        dataViewsService: dataViews,
      })(ssId),
    [savedSearchService, dataViews]
  );

  /**
   * Resolve data view or saved search if exist in the URL.
   */
  const resolveDataSource = useCallback(async () => {
    if (dataViewId === '') {
      throw new Error(
        i18n.translate('xpack.ml.useResolver.errorIndexPatternIdEmptyString', {
          defaultMessage: 'dataViewId must not be empty string.',
        })
      );
    }

    let dataViewAndSavedSearch: DataViewAndSavedSearch = {
      savedSearch: null,
      dataView: null,
    };

    if (savedSearchId !== undefined) {
      dataViewAndSavedSearch = await getDataViewAndSavedSearchCb(savedSearchId);
    } else if (dataViewId !== undefined) {
      dataViewAndSavedSearch.dataView = await dataViews.get(dataViewId);
    }

    const { savedSearch, dataView } = dataViewAndSavedSearch;

    const { combinedQuery } = createSearchItems(
      uiSettings,
      dataView !== null ? dataView : undefined,
      savedSearch
    );

    return {
      combinedQuery,
      selectedDataView: dataView,
      selectedSavedSearch: savedSearch,
    };
  }, [dataViewId, savedSearchId, uiSettings, dataViews, getDataViewAndSavedSearchCb]);

  useEffect(() => {
    resolveDataSource()
      .then((result) => {
        setValue(result as DataSourceContextValue);
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

export const useDataSource = () => {
  return useContext(DataSourceContext);
};
