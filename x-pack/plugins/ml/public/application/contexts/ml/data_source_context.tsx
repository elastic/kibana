/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { EuiEmptyPrompt } from '@elastic/eui';
import { SavedSearchSavedObject } from '../../../../common/types/kibana';
import { DataViewAndSavedSearch } from '../../util/index_utils';
import { useMlKibana } from '../kibana';
import { createSearchItems } from '../../jobs/new_job/utils/new_job_utils';

export interface DataSourceContextValue {
  combinedQuery: any;
  currentDataView: DataView; // TODO this should be DataView or null
  // @deprecated currentSavedSearch is of SavedSearchSavedObject type, change to selectedSavedSearch
  deprecatedSavedSearchObj: SavedSearchSavedObject | null;
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
export const DataSourceContextProvider: FC = ({ children }) => {
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

  const getDataViewAndSavedSearchCallback = useCallback(
    async (ssId: string) => {
      const resp: DataViewAndSavedSearch = {
        savedSearch: null,
        dataView: null,
      };

      if (ssId === undefined) {
        return resp;
      }

      const ss = await savedSearchService.get(ssId);
      if (ss === null) {
        return resp;
      }
      const dataViewIdTemp = ss.references?.find((r) => r.type === 'index-pattern')?.id;
      resp.dataView = await dataViews.get(dataViewIdTemp!);
      resp.savedSearch = ss;
      return resp;
    },
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
    let savedSearch = null;

    if (savedSearchId !== undefined) {
      savedSearch = await savedSearchService.get(savedSearchId);
      dataViewAndSavedSearch = await getDataViewAndSavedSearchCallback(savedSearchId);
    } else if (dataViewId !== undefined) {
      dataViewAndSavedSearch.dataView = await dataViews.get(dataViewId);
    }

    const { savedSearch: deprecatedSavedSearchObj, dataView } = dataViewAndSavedSearch;

    const { combinedQuery } = createSearchItems(
      uiSettings,
      dataView !== null ? dataView : undefined,
      deprecatedSavedSearchObj
    );

    return {
      combinedQuery,
      currentDataView: dataView,
      deprecatedSavedSearchObj,
      selectedSavedSearch: savedSearch,
    };
  }, [
    dataViewId,
    savedSearchId,
    uiSettings,
    dataViews,
    savedSearchService,
    getDataViewAndSavedSearchCallback,
  ]);

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
