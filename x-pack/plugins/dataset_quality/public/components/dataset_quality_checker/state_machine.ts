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
  QualityProblem,
} from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';
import { createDataStreamQualityMitigationStateMachine } from './mitigation_state_machine';

export const createPureDataStreamQualityChecksStateMachine = (
  initialContext: DataStreamQualityChecksContext
) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAwgBZgDGA1gHSkB2Vv6VSlQBekAMQBtAAwBdRKAAOAe1g0qS7vJAAPRAEYATAHYOBqQDYALHvMG71owE5LAGhC1EBgMx6OlywCsAV4AHI4h-gYBRgEAvrFuaJg4+ERkQnRMrJwKFKjcvNxQYhAaYBx8AG5KbOUw6FnsAAp53NJySCDKqgIaWroIRiY2Rl7BRvZ6Tq7uiIGWHEZSlo7mMebRPlJG8YkY2HgEJOTUmczsHLn5hcVguLhKuJd56ABmj4Qc9Y1sLfntWm6aj6nQGlikvj0XmW5ghQ0ceikBjcHgQXnRHER0McUgsMSc6N2ICSB1SxwyDHOOVa3HECju71whD+BUgP1gAM6QN6mlBiGipi8RjWej0IQMoomIRRiHMYQ4AXMYuizhCMSkISJJJSR3Sp0p2S43CurIgYhNnMUKmBvNAYICviRiPxQ2MDplCDsjg4ziC6OiAWsOPMWv2OrSJxoBouLCpfGKpVpFW41VqlwZHwAghQKOzLV1rTz+rKAhwIaKoWsIiE9IGPc4DGWAo4DCEIej0UY9KHkocIxSfhxY9l42I7g8nlc3h907hGYRs7mqRzZIDC+pbTpEKEQj6jEGomYJRKjB6243lsFHM5wbZHD3SbrI2dDcP2KO32wAGJ8KiwZgQPm3IbsWnryuYYyXhsXgGOYqz1lMHAhDBXabE4dghgkxJhn25L6oOn50hmTIsrSEB5quXLriCdqIAAtFMUimJYXg4terbhBY5j1uCCrNt4cHNpYVheA+4Z4VGBFUnSrRAdRm4DHRUS7o4MTKsKuKWHYHpaUxQxCnKARSKxtaWGJuF6pJVJGoRZoWpRVo9CBfIIBsvghEqAQGKpoRijEHrNr4cobBKnHglC5lkpZL4XDwtnmsRzI0myy5yU5NFbmibYKhxYptoGYSnrMrnyoqYreIYrGKveWHahZz7Rpw8WEGoUAYGATQPAARhQYCEGlNqgchfiKl4VhhEiYQ+B6oqhBwwVKsJsGqYqkVPgO1ktQIbUCEUnVKD1fUlGUyapuUW1UDtHXdb1-UOQW6UKfRJkcDBYp6CxDohF5zgemMpbiqsljfSxoRCjsRLcEoEBwFodVRQ1Pxro9oF0Sx3pvTWn3Kt5MyonKpioVMThfS2om1ThCMbYaPC-gIQiiBAyODS5iK+OiLZmNsDrecZM1BIsRMfUEsIeXEFO9lT+HWSaNzM0WrMLFpDrRCTSphB5f2IYDawWBEUQIpheyS+t0uGrLkDy85tEIBWpjBN5hiTNMAUIvNYvBGsPiOD4a39mbsXGslTNUSjLlKt6iqjFMDodj7f3Qkh3nmEqRjfVIOLdhLj7+1Zr5xkUVsZYp3qrIGwNODYUzeHjiBp+Ygt6Kpi12M2NXGznEkxU10kh45LM23bUQwc4Gzih5RWooiAoQteqmqWqLZmdn4nRY1Nm90XT2uTYPphGY3tjflHpON6rrGXKLZVhDHer4jm2tRg8b7YdhBb6jTEsVpn0Fei1gqzNAwgQfRWBsAJZYxN4jxCAA */
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
            mitigateProblem: 'mitigatingProblem',
          },
        },

        unchecked: {
          on: {
            plan: 'planning',
            performPlannedChecks: 'checking',
          },

          exit: 'clearCheckingError',
        },

        mitigatingProblem: {
          invoke: {
            src: 'mitigateProblem',
            id: 'mitigateProblem',
            onDone: 'planning',
          },
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
              getStepId(previousCheckResult.check) === event.stepId
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
              stepId: getStepId(check),
              checkResult,
            };
          })
        );
      },
      mitigateProblem: (context, event) => {
        if (event.type !== 'mitigateProblem') {
          return Promise.reject();
        }

        return createDataStreamQualityMitigationStateMachine({
          dependencies: {
            dataStreamQualityClient,
          },
          initialParameters: {
            dataStream: event.check.data_stream,
            timeRange: event.check.time_range,
            problem: event.problem,
          },
        });
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
  mitigateProblem: {
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
      type: 'mitigateProblem';
      check: CheckPlanStep;
      problem: QualityProblem;
    }
  | {
      type: 'checkFinished';
      stepId: string;
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

const getStepId = (check: CheckPlanStep) => `${check.check_id}-${check.data_stream}`;
