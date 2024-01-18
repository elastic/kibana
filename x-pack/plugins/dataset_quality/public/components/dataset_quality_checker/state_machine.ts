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

export const createPureDataStreamQualityChecksStateMachine = (
  initialContext: DataStreamQualityChecksContext
) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAwgBZgDGA1gHSkB2Vv6VSlQBekAMQBtAAwBdRKAAOAe1g0qS7vJAAPRAEYATAHYOBqQDYALHvMG71owE5LAGhC1EBgMx6OlywCsAV4AHI4h-gYBRgEAvrFuaJg4+ERkQnRMrJwKFKjcvNxQYhAaYBx8AG5KbOUw6FnsAAp53NJySCDKqgIaWroIRiY2Rl7BRvZ6Tq7uiIGWHEZSlo7mMebRPlJG8YkY2HgEJOTUmczsHLn5hcVguLhKuJd56ABmj4Qc9Y1sLfntWm6aj6nQGlikvj0XmW5ghQ0ceikBjcHgQXnRHER0McUgsMSc6N2ICSB1SxwyDHOOVa3HECju71whD+BUgP1gAM6QN6mlBiGipi8RjWej0IQMoomIRRiHMYQ4AXMYuizhCMSkISJJJSR3Sp0p2S43CurIgYhNnMUKmBvNAYICviRiPxQ2MDplCDsjg4ziC6OiAWsOPMWv2OrSJxoBouLCpfGKpVpFW41VqlwZHwAghQKOzLV1rTz+rKAhwIaKoWsIiE9IGPc4DGWAo4DCEIej0UY9KHkocIxSfhxY9l42I7g8nlc3h907hGYRs7mqRzZIDC+pbTpEKEQj6jEGomYJRKjB6243lsFHM5wbZHD3SbrI2dDcP2KO32wAGJ8KiwZgQPm3IbsWnryuYYyXhsXgGOYqz1lMHAhDBXabE4dghgkxJhn25L6oOn50hmTIsrSEB5quXLriCdqIAAtFMUimJYXg4terbhBY5j1uCCrNt4cHNpYVheA+4Z4VGBFUnSrRAdRm4DHRh4KiEEHGI4ATilEawes2vhyhsEqceCUJibheqSVSRqEWaFqUVaPQgXyCAbL4qm1gYjijDWaoBLpCIcAZARGW2JmiVh2rmc+0acDwNnmsRzI0myy5yY5NFbmibYKhxYptoGYSnrMLnyoqYreIYrGKveRLcEoEBwFokVkhZL7sGu6UKfR0JMZpalOJpdiKjMqJyqYqGVuYcH5QYZktdFg48L+AhCKIEAdTaoGIr46ItmY2wOp5UheB6talkMtaioEioahsc1PgOVkmjcG1Fs5egLJYUS1vCZVhKpHo+CY4qrEscpfXpmF7L282PYaz2QK9Tm0QgFamMEnmGJM0z+fpql+msPiOD4939vhVk8Aj61UZ1oFKt6iqjFMDodsTgPQkhnlTVMIQBFIOLdhFOGw+Tr5xkUSMZYp3qrIGlhqgiSoTF4I2IEYqmLF2XlKl9UTXqTEltZwNmS11qOiujMHOBs4qqUVqKIgKELXl5XkKwYlgG61MXWdJ1MOZtzlKuYPphGYRNeHKUh+cVTjeq6x1yi2VY7PEsRAA */
      context: initialContext,
      predictableActionArguments: true,
      id: 'DataStreamQualityCheck',
      initial: 'uninitialized',
      schema: {
        context: {} as DataStreamQualityChecksContext,
        events: {} as DataStreamQualityChecksEvent,
        services: {} as DataStreamQualityChecksServices,
      },
      states: {
        uninitialized: {
          always: 'planning',
        },

        planning: {
          invoke: {
            src: 'getCheckPlan',
            id: 'getCheckPlan',

            onDone: {
              target: 'planned',
              actions: 'storePlan',
            },

            onError: {
              target: 'unplanned',
              actions: 'storePlanningError',
            },
          },

          entry: 'clearPlan',
        },

        planned: {
          on: {
            performPlannedChecks: 'checking',
          },
        },

        unplanned: {
          on: {
            plan: 'planning',
          },

          exit: 'clearPlanningError',
        },

        checking: {
          invoke: {
            src: 'performAllChecks',
            id: 'performAllChecks',
            onDone: 'checked',

            onError: {
              target: 'unchecked',
              actions: 'storeCheckingError',
            },
          },

          on: {
            checkFinished: {
              target: 'checking',
              internal: true,
              actions: 'storeCheckResults',
            },
          },

          entry: 'clearCheckResults',
        },

        checked: {
          on: {
            performPlannedChecks: 'checking',
            plan: 'planning',
          },
        },
        unchecked: {
          on: {
            plan: 'planning',
            performPlannedChecks: 'checking',
          },

          exit: 'clearCheckingError',
        },
      },
    },
    {
      actions: {
        clearCheckingError: assign({
          checkingError: (_context) => '',
        }),
        clearCheckResults: assign((context) => {
          if (!('plan' in context)) {
            return {};
          }

          return {
            checkProgress: (context.plan?.checks ?? []).map(
              (check): DataStreamQualityCheckProgress => ({
                progress: 'pending',
                check,
              })
            ),
          };
        }),
        clearPlan: assign({
          plan: (_context) => null,
        }),
        clearPlanningError: assign({
          planningError: (_context) => '',
        }),
        storePlan: assign((_context, event) => {
          return event.type === 'done.invoke.getCheckPlan' ? { plan: event.data } : {};
        }),
        storeCheckResults: assign((context, event) => {
          if (event.type !== 'checkFinished') {
            return {};
          }

          const previousCheckProgress: DataStreamQualityCheckProgress[] =
            'checkProgress' in context ? context.checkProgress : [];
          const newCheckProgress: DataStreamQualityCheckProgress[] = previousCheckProgress.map(
            (previousCheckResult) =>
              previousCheckResult.check.check_id === event.checkResult.id
                ? {
                    progress: 'finished',
                    check: previousCheckResult.check,
                    execution: event.checkResult,
                  }
                : previousCheckResult
          );

          return {
            checkProgress: newCheckProgress,
          };
        }),
      },
    }
  );

export interface DataStreamQualityChecksStateMachineArguments {
  initialParameters: Parameters;
  dependencies: {
    dataStreamQualityClient: IDataStreamQualityClient;
  };
}

export const createDataStreamQualityChecksStateMachine = ({
  initialParameters,
  dependencies: { dataStreamQualityClient },
}: DataStreamQualityChecksStateMachineArguments) =>
  createPureDataStreamQualityChecksStateMachine({
    parameters: initialParameters,
    plan: null,
    planningError: null,
    checkProgress: [],
    checkingError: null,
  }).withConfig({
    services: {
      getCheckPlan: async (context, event) => {
        return await dataStreamQualityClient.getCheckPlan(context.parameters);
      },
      performAllChecks: (context, event) => {
        return from(context.plan?.checks ?? []).pipe(
          concatMap(async (check) => {
            const checkResult = await dataStreamQualityClient.performCheck(check.check_id, {
              dataStream: check.data_stream,
              timeRange: check.time_range,
            });

            return {
              type: 'checkFinished',
              checkResult,
            };
          })
        );
      },
    },
  });

interface Parameters {
  dataStream: string;
  timeRange: CheckTimeRange;
}

export interface DataStreamQualityChecksContext {
  parameters: Parameters;
  plan: CheckPlan | null;
  planningError: string | null;
  checkProgress: DataStreamQualityCheckProgress[];
  checkingError: string | null;
}

export interface DataStreamQualityChecksServices {
  [service: string]: {
    data: any;
  };
  getCheckPlan: {
    data: CheckPlan;
  };
  performAllChecks: {
    data: undefined;
  };
}

export type DataStreamQualityChecksEvent =
  | {
      type: 'plan';
    }
  | {
      type: 'performPlannedChecks';
    }
  | {
      type: 'checkFinished';
      checkResult: DataStreamQualityCheckExecution;
    }
  | {
      type: `${ActionTypes.DoneInvoke}.getCheckPlan`;
      data: DataStreamQualityChecksServices['getCheckPlan']['data'];
    }
  | {
      type: `${ActionTypes.DoneInvoke}.performAllChecks`;
    };

export type DataStreamQualityCheckProgress =
  | {
      progress: 'pending';
      check: CheckPlanStep;
    }
  | {
      progress: 'finished';
      check: CheckPlanStep;
      execution: DataStreamQualityCheckExecution;
    };
