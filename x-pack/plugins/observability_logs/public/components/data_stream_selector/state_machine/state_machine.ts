/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine } from 'xstate';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DataStreamsSelectorContext,
  DataStreamsSelectorEvent,
  DataStreamsSelectorTypestate,
  DefaultDataStreamsSelectorContext,
} from './types';

export const createPureDataStreamsSelectorStateMachine = (
  initialContext: DefaultDataStreamsSelectorContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IAjKIDs9AGwHdATgMAOXQFYANCACe281foBmUVZPmTV86--+ACwAvsF2aJg4+EQk5FS0DDTSYMqcvAIiEmqysApKqkga2nqGxmaWtg6IAEz0WoEmuq4+fgGuga6hYSDKNBBwahHYeATEpBTUdNnyiipqmggAtAZ2jkvOblai1QaigVpGhwah4RjD0WNxkwxMLJDTubMFoAuB1avaWrUHR7+HJyAhlFRrEJgl6EkUg88nNCgtqlYXFZdKJXF9KmsDK56FYAUCRjFxvE6BDksp6HIIBRoU95oh3Njkaj0R8EForFousEgA */
  createMachine<DataStreamsSelectorContext, DataStreamsSelectorEvent, DataStreamsSelectorTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataStreamsSelector',
      initial: 'closed',
      states: {
        closed: {
          id: 'closed',
          on: {
            TOGGLE: 'open',
          },
        },
        open: {
          initial: 'idle',
          on: {
            TOGGLE: 'closed',
          },
          states: {
            idle: {},
          },
        },
      },
    },
    {
      actions: {},
    }
  );

export interface DataStreamsStateMachineDependencies {
  initialContext?: DefaultDataStreamsSelectorContext;
}

export const createDataStreamsSelectorStateMachine = ({
  initialContext,
}: DataStreamsStateMachineDependencies) =>
  createPureDataStreamsSelectorStateMachine(initialContext).withConfig({
    services: {},
  });
