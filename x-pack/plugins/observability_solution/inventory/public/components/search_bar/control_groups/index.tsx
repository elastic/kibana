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
import React, { useCallback, useEffect, useRef } from 'react';
import { skip, Subscription } from 'rxjs';
import { css } from '@emotion/react';
import { useInventorySearchBarContext } from '../../../context/inventory_search_bar_context_provider';
import { useUnifiedSearch } from '../../../hooks/use_unified_search';
import { useControlPanels } from './use_control_panels';

export function ControlGroups() {
  const { isControlPanelsInitiated, setIsControlPanelsInitiated, dataView } =
    useInventorySearchBarContext();
  const { controlPanels, setControlPanels } = useControlPanels(dataView);
  const { searchState, setSearchState } = useUnifiedSearch();
  console.log('### caue  ControlGroups  searchState:', searchState);
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
          setSearchState((state) => ({ ...state, controlFilters: newFilters }));
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
    [isControlPanelsInitiated, setControlPanels, setIsControlPanelsInitiated, setSearchState]
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
    <div
      css={css`
        .controlsWrapper {
          align-items: flex-start;
          min-height: initial;
        }
        .controlGroup {
          min-height: initial;
        }
      `}
    >
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
