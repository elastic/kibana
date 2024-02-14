/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret } from '@xstate/react';
import createContainer from 'constate';
import useMount from 'react-use/lib/useMount';
import { InventoryOptionsState } from '../../../../../common/inventory_views';
import { isDevMode } from '../../../../utils/dev_mode';
import {
  createInventoryPageStateMachine,
  type InventoryPageStateMachineDependencies,
} from './state_machine';

export const DEFAULT_WAFFLE_OPTIONS_STATE: InventoryOptionsState = {
  metric: { type: 'cpu' },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: [],
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
  accountId: '',
  region: '',
  customMetrics: [],
  legend: {
    palette: 'cool',
    steps: 10,
    reverseColors: false,
  },
  source: 'default',
  sort: { by: 'name', direction: 'desc' },
  timelineOpen: false,
};

export const useInventoryPageState = ({
  inventoryViewsService,
  urlStateStorage,
  useDevTools = isDevMode(),
}: {
  useDevTools?: boolean;
} & InventoryPageStateMachineDependencies) => {
  useMount(() => {
    // eslint-disable-next-line no-console
    console.log(
      "A warning in console stating: 'The result of getSnapshot should be cached to avoid an infinite loop' is expected. This will be fixed once we can upgrade versions."
    );
  });

  const inventoryPageStateService = useInterpret(
    () =>
      createInventoryPageStateMachine(
        {
          filter: { kind: 'kuery', expression: '' },
          options: DEFAULT_WAFFLE_OPTIONS_STATE,
          time: { currentTime: Date.now(), isAutoReloading: false },
          savedViewId: '0',
        },
        {
          inventoryViewsService,
          urlStateStorage,
        }
      ),
    { devTools: useDevTools }
  );

  return inventoryPageStateService;
};

export const [InventoryPageStateProvider, useInventoryPageStateContext] =
  createContainer(useInventoryPageState);
