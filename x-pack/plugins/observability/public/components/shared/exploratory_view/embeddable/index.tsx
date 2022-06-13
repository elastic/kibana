/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import type { ExploratoryEmbeddableProps, ExploratoryEmbeddableComponentProps } from './embeddable';
import { ObservabilityDataViews } from '../../../../utils/observability_data_views';
import type { DataViewState } from '../hooks/use_app_data_view';
import type { AppDataType } from '../types';

const Embeddable = React.lazy(() => import('./embeddable'));

function ExploratoryViewEmbeddable(props: ExploratoryEmbeddableComponentProps) {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Embeddable {...props} />
    </React.Suspense>
  );
}

export function getExploratoryViewEmbeddable(
  uiSettings?: IUiSettingsClient,
  dataViews?: DataViewsPublicPluginStart,
  lens?: LensPublicStart
) {
  return (props: ExploratoryEmbeddableProps) => {
    if (!dataViews || !lens) {
      return null;
    }

    const [indexPatterns, setIndexPatterns] = useState<DataViewState>({} as DataViewState);
    const [loading, setLoading] = useState(false);

    const series = props.attributes && props.attributes[0];

    const isDarkMode = uiSettings?.get('theme:darkMode');

    const loadIndexPattern = useCallback(
      async ({ dataType }: { dataType: AppDataType }) => {
        const dataTypesIndexPatterns = props.dataTypesIndexPatterns;

        setLoading(true);
        try {
          const obsvIndexP = new ObservabilityDataViews(dataViews);
          const indPattern = await obsvIndexP.getDataView(
            dataType,
            dataTypesIndexPatterns?.[dataType]
          );
          setIndexPatterns((prevState) => ({ ...(prevState ?? {}), [dataType]: indPattern }));

          setLoading(false);
        } catch (e) {
          setLoading(false);
        }
      },
      [props.dataTypesIndexPatterns]
    );

    useEffect(() => {
      if (series?.dataType) {
        loadIndexPattern({ dataType: series.dataType });
      }
    }, [series?.dataType, loadIndexPattern]);

    if (Object.keys(indexPatterns).length === 0 || loading) {
      return <EuiLoadingSpinner />;
    }

    return (
      <EuiThemeProvider darkMode={isDarkMode}>
        <ExploratoryViewEmbeddable {...props} indexPatterns={indexPatterns} lens={lens} />
      </EuiThemeProvider>
    );
  };
}
