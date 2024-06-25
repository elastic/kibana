/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { useSearchApi } from '@kbn/presentation-publishing';
import React from 'react';
import { useMemo, useRef } from 'react';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import type { LensApi, LensRuntimeState, LensSerializedState } from './types';

export interface Props {
  title?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;

  onApiAvailable?: (api: LensApi) => void;
}

export function LensRenderer(props: Props) {
  const apiRef = useRef<LensApi | undefined>(undefined);

  const initialState = useMemo(() => {
    const rawState: LensSerializedState = {
      attributes: {
        title: props.title ?? '',
        description: '',
        visualizationType: null,
        references: [],
        state: {
          query: props.query || { query: '', language: 'kuery' },
          filters: props.filters || [],
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

  return (
    <ReactEmbeddableRenderer<LensSerializedState, LensApi, LensRuntimeState>
      type={LENS_EMBEDDABLE_TYPE}
      getParentApi={() => ({ ...searchApi, getSerializedStateForChild: () => initialState })}
      onApiAvailable={(api) => {
        apiRef.current = api;

        if (props.onApiAvailable) {
          props.onApiAvailable(api);
        }
      }}
      hidePanelChrome={true}
    />
  );
}
