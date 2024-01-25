/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, from } from 'rxjs';
import { createMachine, assign, ActionTypes } from 'xstate';
import {
  CheckPlan,
  CheckPlanStep,
  CheckTimeRange,
  DataStreamQualityCheckExecution,
} from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';

export const createPureDataStreamQualityMitigationStateMachine = (
  initialContext: DataStreamQualityMitigationContext
) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAsjVVBlQPYB2AdBW6hFQ5RG6Zq06wAxBE5guggG5sA1nJjoRY0RIDaABgC6iUAAc2sJp2MgAHogCsAJi4BGAJz2AzC8f2ANCC0iI4uABxcepGRnk4uer4A7I4AvskBaJg4+ERklDQMTCza3Lz8gsKF4hxSMhxyiipqYBqVxbA6LkZIIGYWxdZ2CAC0jgBsnlyhjnoxUwnjo0kBQQgh4VHRsfH2SanpGNh4BCTk1HSaRezcABaosBdVUqgmJhQFopec+l2m5pYcA0QLk8ABZJlNQj5-IFEJ4EvYuPYNjEQtt4XsQBlDtkTnlzq0rlxnq9aOUHsVpLJ5BwlKoiS83uSrt9rL1-oCED49JNHJC9G4EiCfHE3CDlg5RRFkVtEhisVljrkzu8tITiW8yQTOJIwLhcGxcFxXhgAGYGwj0klMr6GVl-frdQYgvQIvShexuPSjNxTEEhNzihAgyVIqIouKJexyg4KnKnfLWm53ABybETUhNgiosGuLO6bIdoEGQxcCQm9lGvmDnlGLhcIPsILFMIQ7pcXGDbh9o0bZZdbmjmSOcbxKs+3HVVEgickmY42dztvz9quHNL7c8ehBi0cjiFqNFgfm4VDm1RsrSmJjw9xysTXBNqCoFGnWo4knweFoed+fVXjsQRYwXrfsm19f1Ax8ZwNhmGUdhSS95RvJUEzfB8nxfCAZznBcfx6FcrAAhBFnbcZHASSEfT3CCWzbRFpXPHZUkvDg2AgOBrCQnEUPxD4qjtP9CKLRAhm8dsplguYFiWFs6ylKIyxiIVQnmKNEOvbj4141VOB4PgBCEdMBPZIjRj0QMfXosM4N2dSh000d71ue433gZdBIBIifFCQNHC7eSzwjHY1P2ezFS0scqktDVDLfYzC1sBxy3dNw4WhFZtzcKzArREKrzCkc7zQ5zUyM9yTOE4Zpg3aYaxdUJIlreJfP8mDw1ywdsXCxy0NqMB4v-Sr6w3GI3F3PdhX5ZsVndblfGsxiEk62Nb1QvjimiqcsLi8qEsGYFuT0CiRUFSbDxbUZQgmNqbOW5CIvvR9n1fdbBvwjyOXGBIIhSr0qL9dxA2rALYMWtTUiAA */
      context: initialContext,
      predictableActionArguments: true,
      id: 'DataStreamQualityMitigation',
      initial: 'loadingMitigations',
      schema: {
        context: {} as DataStreamQualityMitigationContext,
        events: {} as DataStreamQualityMitigationEvent,
        services: {} as DataStreamQualityMitigationServices,
      },
      states: {
        loadingMitigations: {
          invoke: {
            src: 'getMitigations',
            id: 'getMitigations',

            onDone: [
              {
                target: 'hasMitigations',
                cond: 'hasMitigations',
              },
              'hasNoMitigations',
            ],
          },
        },

        hasMitigations: {
          on: {
            applyMitigation: 'applyingMitigation',
          },
        },

        applyingMitigation: {
          invoke: {
            src: 'applyMitigation',
            id: 'applyMitigation',
            onDone: 'appliedMitigation',
            onError: 'failedMitigation',
          },
        },

        hasNoMitigations: {
          on: {
            finish: 'done',
          },
        },

        done: {
          type: 'final',
        },

        appliedMitigation: {
          on: {
            finish: 'done',
          },
        },

        failedMitigation: {
          on: {
            retry: 'loadingMitigations',
            finish: 'done',
          },
        },
      },
    },
    {
      actions: {},
    }
  );

export interface DataStreamQualityMitigationStateMachineArguments {
  initialParameters: Parameters;
  dependencies: {
    dataStreamQualityClient: IDataStreamQualityClient;
  };
}

export const createDataStreamQualityMitigationStateMachine = ({
  initialParameters,
  dependencies: { dataStreamQualityClient },
}: DataStreamQualityMitigationStateMachineArguments) =>
  createPureDataStreamQualityMitigationStateMachine({
    parameters: initialParameters,
  }).withConfig({
    services: {},
  });

interface Parameters {
  dataStream: string;
  timeRange: CheckTimeRange;
}

export interface DataStreamQualityMitigationContext {
  parameters: Parameters;
}

export interface DataStreamQualityMitigationServices {
  [service: string]: {
    data: any;
  };
  getMitigations: {
    data: null;
  };
  applyMitigation: {
    data: null;
  };
}

export type DataStreamQualityMitigationEvent =
  | {
      type: 'applyMitigation';
    }
  | {
      type: 'finish';
    }
  | {
      type: 'retry';
    }
  | {
      type: `${ActionTypes.DoneInvoke}.getMitigations`;
      data: DataStreamQualityMitigationServices['getMitigations']['data'];
    }
  | {
      type: `${ActionTypes.DoneInvoke}.applyMitigations`;
    }
  | {
      type: `${ActionTypes.ErrorExecution}.applyMitigations`;
    };
