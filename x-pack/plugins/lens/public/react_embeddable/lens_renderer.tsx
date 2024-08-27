/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import React from 'react';
import { useMemo, useRef } from 'react';
import type { LensApi, LensRendererProps, LensRuntimeState, LensSerializedState } from './types';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';

export function LensRenderer({
  title,
  query,
  filters,
  withDefaultActions,
  extraActions,
  ...props
}: LensRendererProps) {
  const apiRef = useRef<LensApi | undefined>(undefined);

  const initialState = useMemo(() => {
    const rawState: LensSerializedState = {
      attributes: {
        title: title ?? '',
        description: '',
        visualizationType: null,
        references: [],
        state: {
          query: query || { query: '', language: 'kuery' },
          filters: filters || [],
          internalReferences: [],
          datasourceStates: {},
          visualization: {},
        },
      },
    };
    return { rawState, references: [] };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const searchApi = useSearchApi(props);

  const showPanelChrome = Boolean(withDefaultActions) || (extraActions && extraActions?.length > 0);

  return (
    <ReactEmbeddableRenderer<LensSerializedState, LensRuntimeState, LensApi>
      type={LENS_EMBEDDABLE_TYPE}
      getParentApi={() => ({ ...searchApi, getSerializedStateForChild: () => initialState })}
      onApiAvailable={(api) => {
        apiRef.current = api;
      }}
      hidePanelChrome={!showPanelChrome}
    />
  );
}

export type EmbeddableComponent = React.ComponentType<LensRendererProps>;
