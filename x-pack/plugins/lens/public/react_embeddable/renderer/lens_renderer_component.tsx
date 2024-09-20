/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import React, { useEffect, useRef } from 'react';
import type { LensApi, LensRendererProps, LensRuntimeState, LensSerializedState } from '../types';
import { LENS_EMBEDDABLE_TYPE } from '../../../common/constants';

function createEmptyLensState(
  title: LensSerializedState['title'],
  query: LensSerializedState['query'],
  filters: LensSerializedState['filters']
) {
  return {
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
}
/**
 * The aim of this component is to provide a wrapper for other plugins who want to
 * use a Lens component into their own page. This hides the embeddable parts of it
 * by wrapping it into a ReactEmbeddableRenderer component and exposing a custom API
 */
export function LensRenderer({
  title,
  query,
  filters,
  withDefaultActions,
  extraActions,
  showInspector,
  ...props
}: LensRendererProps) {
  const apiRef = useRef<LensApi | undefined>(undefined);
  const initialStateRef = useRef<LensSerializedState>(
    props.attributes || createEmptyLensState(title, query, filters)
  );

  const searchApi = useSearchApi(props);

  const showPanelChrome = Boolean(withDefaultActions) || (extraActions && extraActions?.length > 0);

  // Re-render on changes
  // internally the embeddable will evaluate whether it is worth to actual render or not
  useEffect(() => {
    const lensApi = apiRef.current;
    // trigger a re-render if the attributes change
    if (lensApi && lensApi) {
      lensApi.updateState({
        overrides: props.overrides,
        attributes: { ...initialStateRef.current, ...props.attributes },
      });
    }
  }, [props.attributes, props.overrides]);

  return (
    <ReactEmbeddableRenderer<LensSerializedState, LensRuntimeState, LensApi>
      type={LENS_EMBEDDABLE_TYPE}
      getParentApi={() => ({
        // forward the unified search context
        ...searchApi,
        // forward the Lens components to the embeddable
        ...props,
        // make sure to provide the initial state (useful for the comparison check)
        getSerializedStateForChild: () => ({ rawState: initialStateRef.current, references: [] }),
        // update the runtime state on changes
        getRuntimeStateForChild: () => ({
          ...initialStateRef.current,
          attributes: props.attributes,
        }),
      })}
      onApiAvailable={(api) => {
        apiRef.current = api;
      }}
      hidePanelChrome={!showPanelChrome}
      panelProps={{
        hideInspector: !showInspector,
      }}
    />
  );
}

export type EmbeddableComponent = React.ComponentType<LensRendererProps>;
