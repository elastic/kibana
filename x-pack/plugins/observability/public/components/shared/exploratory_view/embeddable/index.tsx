/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import type { ExploratoryEmbeddableProps, ExploratoryEmbeddableComponentProps } from './embeddable';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { useLoadIndexPattern } from './use_load_index_pattern';

const Embeddable = React.lazy(() => import('./embeddable'));

function ExploratoryViewEmbeddable(props: ExploratoryEmbeddableComponentProps) {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Embeddable {...props} />
    </React.Suspense>
  );
}

export function getExploratoryViewEmbeddable(
  core: CoreStart,
  plugins: ObservabilityPublicPluginsStart
) {
  return (props: ExploratoryEmbeddableProps) => {
    const series = props.attributes && props.attributes[0];

    const isDarkMode = core.uiSettings.get('theme:darkMode');

    const { indexPatterns, loading } = useLoadIndexPattern({
      dataType: series.dataType,
      dataTypesIndexPatterns: props.dataTypesIndexPatterns,
      dataViewsPlugin: plugins.dataViews,
      retryOnFetchDataViewFailure: props.retryOnFetchDataViewFailure,
    });

    if (Object.keys(indexPatterns).length === 0 || loading) {
      return <EuiLoadingSpinner />;
    }

    return (
      <EuiThemeProvider darkMode={isDarkMode}>
        <ExploratoryViewEmbeddable {...props} indexPatterns={indexPatterns} lens={plugins.lens} />
      </EuiThemeProvider>
    );
  };
}
