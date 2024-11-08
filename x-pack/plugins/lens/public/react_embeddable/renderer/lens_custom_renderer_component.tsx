/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import React, { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { LensApi, LensRendererProps, LensRuntimeState, LensSerializedState } from '../types';
import { LENS_EMBEDDABLE_TYPE } from '../../../common/constants';
import { createEmptyLensState } from '../helper';

/**
 * The aim of this component is to provide a wrapper for other plugins who want to
 * use a Lens component into their own page. This hides the embeddable parts of it
 * by wrapping it into a ReactEmbeddableRenderer component and exposing a custom API
 */
export function LensRenderer({
  title,
  withDefaultActions,
  extraActions,
  showInspector,
  syncColors,
  syncCursor,
  syncTooltips,
  viewMode,
  id,
  ...props
}: LensRendererProps) {
  // Use the settings interface to store panel settings
  const settings = useMemo(() => {
    return {
      syncColors$: new BehaviorSubject(false),
      syncCursor$: new BehaviorSubject(false),
      syncTooltips$: new BehaviorSubject(false),
    };
  }, []);

  // view mode needs to be a BehaviorSubject
  const viewMode$Ref = useRef(new BehaviorSubject(viewMode));
  if (viewMode !== viewMode$Ref.current.getValue()) {
    viewMode$Ref.current.next(viewMode);
  }

  const apiRef = useRef<LensApi | undefined>(undefined);
  const initialStateRef = useRef<LensSerializedState>(
    props.attributes ? { attributes: props.attributes } : createEmptyLensState(null, title)
  );

  const searchApi = useSearchApi(props);

  const showPanelChrome = Boolean(withDefaultActions) || (extraActions?.length || 0) > 0;

  // Re-render on changes
  // internally the embeddable will evaluate whether it is worth to actual render or not
  useEffect(() => {
    const lensApi = apiRef.current;
    // trigger a re-render if the attributes change
    if (lensApi) {
      lensApi.updateAttributes({ ...initialStateRef.current, ...props.attributes });
      lensApi.updateOverrides(props.overrides);
    }
  }, [props.attributes, props.overrides]);

  useEffect(() => {
    if (syncColors != null && settings.syncColors$.getValue() !== syncColors) {
      settings.syncColors$.next(syncColors);
    }
    if (syncCursor != null && settings.syncCursor$.getValue() !== syncCursor) {
      settings.syncCursor$.next(syncCursor);
    }
    if (syncTooltips != null && settings.syncTooltips$.getValue() !== syncTooltips) {
      settings.syncTooltips$.next(syncTooltips);
    }
  }, [settings, syncColors, syncCursor, syncTooltips]);

  return (
    <ReactEmbeddableRenderer<LensSerializedState, LensRuntimeState, LensApi>
      type={LENS_EMBEDDABLE_TYPE}
      maybeId={id}
      getParentApi={() => ({
        // forward the Lens components to the embeddable
        ...props,
        // forward the unified search context
        ...searchApi,
        viewMode: viewMode$Ref.current,
        // pass the sync* settings with the unified settings interface
        settings,
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
        hideHeader: showPanelChrome,
        showNotifications: false,
        showShadow: false,
        showBadges: false,
      }}
    />
  );
}

export type EmbeddableComponent = React.ComponentType<LensRendererProps>;
