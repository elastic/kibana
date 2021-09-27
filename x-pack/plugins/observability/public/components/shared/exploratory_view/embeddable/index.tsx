/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { CoreStart } from 'kibana/public';
import type { ExploratoryEmbeddableProps, ExploratoryEmbeddableComponentProps } from './embeddable';
import { DataView } from '../../../../../../../../src/plugins/data/common';
import { ObservabilityIndexPatterns } from '../utils/observability_index_patterns';
import { ObservabilityPublicPluginsStart } from '../../../../plugin';

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
    const [indexPattern, setIndexPattern] = useState<DataView>();
    const [loading, setLoading] = useState(false);

    const series = Object.entries(props.attributes)[0][1];

    const loadIndexPattern = useCallback(async ({ dataType: dt }) => {
      setLoading(true);
      try {
        const obsvIndexP = new ObservabilityIndexPatterns(plugins.data);
        const indPattern = await obsvIndexP.getIndexPattern(dt, 'heartbeat-*');
        setIndexPattern(indPattern!);

        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadIndexPattern({ dataType: series.dataType });
    }, [series.dataType, loadIndexPattern]);

    if (!indexPattern || loading) {
      return <EuiLoadingSpinner />;
    }

    return <ExploratoryViewEmbeddable {...props} indexPattern={indexPattern} lens={plugins.lens} />;
  };
}
