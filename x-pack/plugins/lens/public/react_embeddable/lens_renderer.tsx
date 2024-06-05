/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import React from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import { LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import type { LensApi, LensSerializedState } from './types';

export interface Props {
  title?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;

  onApiAvailable?: (api: LensApi) => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

function useParentApi(props: Pick<Props, 'filters' | 'query' | 'timeRange'>) {
  const parentApi = useMemo(() => {
    return {
      filters$: new BehaviorSubject(props.filters),
      query$: new BehaviorSubject(props.query),
      timeRange$: new BehaviorSubject(props.timeRange),
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    parentApi.filters$.next(props.filters);
  }, [props.filters, parentApi.filters$]);
  useEffect(() => {
    parentApi.query$.next(props.query);
  }, [props.query, parentApi.query$]);
  useEffect(() => {
    parentApi.timeRange$.next(props.timeRange);
  }, [props.timeRange, parentApi.timeRange$]);

  return parentApi;
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

  const parentApi = useParentApi(props);

  return (
    <div>
      <ReactEmbeddableRenderer<LensSerializedState, LensApi>
        type={LENS_EMBEDDABLE_TYPE}
        state={initialState}
        parentApi={parentApi}
        onApiAvailable={(api) => {
          apiRef.current = api;

          if (props.onApiAvailable) {
            props.onApiAvailable(api);
          }
        }}
        hidePanelChrome={true}
      />
    </div>
  );
}
