/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { parse, stringify } from 'query-string';
import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { encode } from 'rison-node';
import { SimpleSavedObject } from '../../../../../../src/core/public/saved_objects/simple_saved_object';
import { IndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/index_patterns/index_pattern';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import { getCoreStart, getPluginsStart } from '../../kibana_services';
import type { ResultLink } from '../common/components/results_links/results_links';
import type { Accessor, Dictionary, SetUrlState } from '../common/util/url_state';
import {
  getNestedProperty,
  isRisonSerializationRequired,
  parseUrlState,
  Provider as UrlStateContextProvider,
} from '../common/util/url_state';
import { useDataVisualizerKibana } from '../kibana_context';
import '../_index.scss';
import type { IndexDataVisualizerViewProps } from './components/index_data_visualizer_view/index_data_visualizer_view';
import { IndexDataVisualizerView } from './components/index_data_visualizer_view/index_data_visualizer_view';

// @ts-ignore
export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;

export interface DataVisualizerUrlStateContextProviderProps {
  IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
  additionalLinks: ResultLink[];
}

export const DataVisualizerUrlStateContextProvider: FC<DataVisualizerUrlStateContextProviderProps> = ({
  IndexDataVisualizerComponent,
  additionalLinks,
}) => {
  const {
    services: {
      data: { indexPatterns },
      savedObjects: { client: savedObjectsClient },
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();
  const history = useHistory();

  const [currentIndexPattern, setCurrentIndexPattern] = useState<IndexPattern | undefined>(
    undefined
  );
  const [currentSavedSearch, setCurrentSavedSearch] = useState<SimpleSavedObject<unknown> | null>(
    null
  );
  const { search: searchString } = useLocation();

  useEffect(() => {
    const prevSearchString = searchString;
    const parsedQueryString = parse(prevSearchString, { sort: false });

    const getIndexPattern = async () => {
      if (typeof parsedQueryString?.savedSearchId === 'string') {
        const savedSearchId = parsedQueryString.savedSearchId;
        try {
          const savedSearch = await savedObjectsClient.get('search', savedSearchId);
          const indexPatternId = savedSearch.references.find((ref) => ref.type === 'index-pattern')
            ?.id;
          if (indexPatternId !== undefined && savedSearch) {
            try {
              const indexPattern = await indexPatterns.get(indexPatternId);
              setCurrentSavedSearch(savedSearch);
              setCurrentIndexPattern(indexPattern);
            } catch (e) {
              toasts.addError(e, {
                title: i18n.translate('xpack.dataVisualizer.index.indexPatternErrorMessage', {
                  defaultMessage: 'Error finding index pattern',
                }),
              });
            }
          }
        } catch (e) {
          toasts.addError(e, {
            title: i18n.translate('xpack.dataVisualizer.index.savedSearchErrorMessage', {
              defaultMessage: 'Error retrieving saved search {savedSearchId}',
              values: { savedSearchId },
            }),
          });
        }
      }

      if (typeof parsedQueryString?.index === 'string') {
        const indexPattern = await indexPatterns.get(parsedQueryString.index);
        setCurrentIndexPattern(indexPattern);
      }
    };
    getIndexPattern();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectsClient, toasts, indexPatterns]);

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = searchString;
      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.prototype.hasOwnProperty.call(urlState, accessor)) {
        urlState[accessor] = {};
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    [history, searchString]
  );

  return (
    <UrlStateContextProvider value={{ searchString, setUrlState }}>
      {currentIndexPattern ? (
        <IndexDataVisualizerComponent
          currentIndexPattern={currentIndexPattern}
          currentSavedSearch={currentSavedSearch}
          additionalLinks={additionalLinks}
        />
      ) : (
        <div />
      )}
    </UrlStateContextProvider>
  );
};

export const IndexDataVisualizer: FC<{ additionalLinks: ResultLink[] }> = ({ additionalLinks }) => {
  const coreStart = getCoreStart();
  const {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    lens,
    indexPatternFieldEditor,
  } = getPluginsStart();
  const services = {
    data,
    maps,
    embeddable,
    share,
    security,
    fileUpload,
    lens,
    indexPatternFieldEditor,
    ...coreStart,
  };

  return (
    <KibanaContextProvider services={{ ...services }}>
      <DataVisualizerUrlStateContextProvider
        IndexDataVisualizerComponent={IndexDataVisualizerView}
        additionalLinks={additionalLinks}
      />
    </KibanaContextProvider>
  );
};
