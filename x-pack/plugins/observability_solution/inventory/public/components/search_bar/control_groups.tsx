/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ControlGroupRenderer,
  ControlGroupRendererApi,
  ControlGroupRuntimeState,
} from '@kbn/controls-plugin/public';
import { ENTITY_TYPE } from '@kbn/observability-shared-plugin/common';
import { ControlPanels, useControlPanels } from '@kbn/observability-shared-plugin/public';
import React, { useCallback, useEffect, useRef } from 'react';
import { skip, Subscription } from 'rxjs';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';

const controlPanelDefinitions: ControlPanels = {
  [ENTITY_TYPE]: {
    order: 0,
    type: 'optionsListControl',
    fieldName: ENTITY_TYPE,
    width: 'small',
    grow: false,
    title: 'Type',
  },
};

export function ControlGroups() {
  const {
    isControlPanelsInitiated,
    setIsControlPanelsInitiated,
    dataView,
    searchState,
    onPanelFiltersChange,
  } = useUnifiedSearchContext();
  const [controlPanels, setControlPanels] = useControlPanels(controlPanelDefinitions, dataView);
  const subscriptions = useRef<Subscription>(new Subscription());

  const getInitialInput = useCallback(
    () => async () => {
      const initialInput: Partial<ControlGroupRuntimeState> = {
        chainingSystem: 'HIERARCHICAL',
        labelPosition: 'oneLine',
        initialChildControlState: controlPanels,
      };

      return { initialState: initialInput };
    },
    [controlPanels]
  );

  const loadCompleteHandler = useCallback(
    (controlGroup: ControlGroupRendererApi) => {
      if (!controlGroup) return;

      subscriptions.current.add(
        controlGroup.filters$.pipe(skip(1)).subscribe((newFilters = []) => {
          onPanelFiltersChange(newFilters);
        })
      );

      subscriptions.current.add(
        controlGroup.getInput$().subscribe(({ initialChildControlState }) => {
          if (!isControlPanelsInitiated) {
            setIsControlPanelsInitiated(true);
          }
          setControlPanels(initialChildControlState);
        })
      );
    },
    [isControlPanelsInitiated, onPanelFiltersChange, setControlPanels, setIsControlPanelsInitiated]
  );

  useEffect(() => {
    const currentSubscriptions = subscriptions.current;
    return () => {
      currentSubscriptions.unsubscribe();
    };
  }, []);

  if (!dataView) {
    return null;
  }

  return (
    <div>
      <ControlGroupRenderer
        getCreationOptions={getInitialInput()}
        onApiAvailable={loadCompleteHandler}
        query={searchState.query}
        compressed={false}
        filters={searchState.filters}
      />
    </div>
  );
}
