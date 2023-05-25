/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IAjABYAnPQBMAdgDMOnQDZjOrbqsBWADQgAnokM6H9Y4dOiHBwAOUT0g4wc9QwBfaJc0TBx8IhJyKloGGmkwZU5eAREJNVlYBSVVJA1tfSMzC2tbe0tnN209b0M-UQtIwwdTSNj4jGw8AmJSCmo6eiyctgBhAAkAQQA5HkEAfQAFdcF+MUlKkrKVNU0ELUCjXSDLHVEQvuNdF3crrXoHoN+vB9M-kMWmMsTiIGUNAgcDUCVGyQmaWmuGK8kU50qlwAtJZ3ogsRF6EEHHZrjoBpZLHpjEEhiA4UlxqkphlGMxWBBUaV0RVQJcdIY8QhDKIvv5LKZjNT2gLBuCGWMUpN0jM5ryQKceRcPNYfKJjKIHiDDHpxUKtA96NT-A5DEEtEE7UEBnSFQjmSrMtllPQ5BAKFyzurLqZrnqDUbfKbDUK+oZ6DozKJQ1pTIZLA6HJYwdEgA */
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
            CHANGE_PANEL: {
              actions: 'storePanelId',
            },
          },
          states: {
            idle: {},
          },
        },
      },
    },
    {
      actions: {
        storePanelId: assign((_context, event) =>
          'panelId' in event ? { panelId: event.panelId } : {}
        ),
      },
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
