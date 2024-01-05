/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine, assign, ActionTypes } from 'xstate';
import { CheckPlan, DataStreamQualityCheckExecution } from '../../../common';

export const createPureDataStreamQualityChecksStateMachine = (
  initialContext: DataStreamQualityChecksContext
) =>
  createMachine<
    DataStreamQualityChecksContext,
    DataStreamQualityChecksEvent,
    DataStreamQualityChecksTypeState
  >(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAwgBZgDGA1gHSkB2Vv6VSlQBekAMQBtAAwBdRKAAOAe1g0qS7vJAAPRAEYATAHYOBqQDYALHvMG71owE5LAGhC1EBgMx6OlywCsAV4AHI4h-gYBRgEAvrFuaJg4+ERkQnRMrJwKFKjcvNxQYhAaYBx8AG5KbOUw6FnsAAp53NJySCDKqgIaWroIRiY2Rl7BRvZ6Tq7uiIGWHEZSlo7mMebRPlJG8YkY2HgEJOTUmczsHLn5hcVguLhKuJd56ABmj4Qc9Y1sLfntWm6aj6nQGlikvj0XmW5ghQ0ceikBjcHgQXnRHER0McUgsMSc6N2ICSB1SxwyDHOnB4VwK4lpAM6QN6mlBcwCviRiPxQ2MHJRngMjg4ziC6OiAWsOPMRJJKSO6VOlOyz2u9Lu71whD+dIgP1gjMUKmBrNAA2ipi8RjWej0IQMtomIQFCHMYQ4AXMduizhCMSkIVl+3laRONGVFxYVL4xVK3HKVRq5QUGo+AEEKBR9YausaWf1EBsOBDbVC1hEQnpJS7nAZiwFHAYQhD0eijHog8lDqGKT8OFHsjGxHcHk8rm8PpdU1qM1mqQbZIC8+pTTpEKEQiKjFKomYHQ6jC7m3XlsFHM5wbZHJ3SQqw2cVTwB+x6a0c8yVwXXRyOCEvQEhVGSs-QCF0G18N0NgdcJlhbG8Q3JJU+yfKl1VwTVtVaeM9Xnd9lxBM112bD0mwREJm0lMJD1mV13U9O1vEMLxHE9a8EmJYNu0Q8M+2fNghz4gAxPgqFgZgIDwnpPzZBBSI4cwxlPDYvAMcxVhrKZfxU9tNicOwZXYuUuMVHiqX7VCIDEFN0I+HVsOzRcmXw1cBgAWimKRTEsZipHPUjm3Mcwa3BD0G28NSG0sKwvHg4z7wjTg+Nff5HKNKSCLXBBXN3D0-20lj7SiNYwIReS-wAvQYPBKF4nY7glAgOAtCMskTIfdgl3SlzEFc6FPICPLjAKuxPRmVE3VMdtLHIxwrSkHxYta+LkMKNQhFECBOpNL9EV8dFGzMbYOSFeaXSrAJFh021Ak9AMNkWu9ezM2kbi2-MZL0BZLCiKt4XosI-xdHwTHtVYljdb7wIMvYuyWp6VReyA3ukwiEFLUxgiFQxJmmEqIPK4I1h8WaO0Mzi4aQsyaSwpGnK6r8vWFT1RimDlW1moHoV-IVAqmEIAl8iEHp7SmVT4mNkYytzhVWSVpqcGwpm8MbECMP9Lsq61PpG89he49rEosyXurR20MZU5wNntP9qNRRELQhc9HCcNW9MsPW2oSrhuCSza6e2mSvXMEUwjMYmvDdKRQJopxhV5ea3UbcsdlqoA */
      context: initialContext,
      predictableActionArguments: true,
      id: 'DataStreamQualityCheck',
      initial: 'uninitialized',
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

            onError: [
              {
                target: 'unchecked',
                actions: 'storeCheckingError',
              },
              {
                target: 'checking',
                internal: true,
              },
            ],
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
            checkProgress: context.plan.checks.map(
              (checkId): DataStreamQualityCheckProgress => ({
                progress: 'pending',
                id: checkId,
              })
            ),
          };
        }),
        clearPlanningError: assign({
          planningError: (_context) => '',
        }),
        storePlan: assign((_context, event) => {
          return event.type === 'done.invoke.getCheckPlan' ? { plan: event.plan } : {};
        }),
        storeCheckResults: assign((context, event) => {
          if (event.type !== 'checkFinished') {
            return {};
          }

          const previousCheckProgress: DataStreamQualityCheckProgress[] =
            'checkProgress' in context ? context.checkProgress : [];
          const newCheckProgress: DataStreamQualityCheckProgress[] = previousCheckProgress.map(
            (previousCheckResult) =>
              previousCheckResult.id === event.checkResult.id
                ? {
                    progress: 'finished',
                    id: previousCheckResult.id,
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

type DataStreamQualityChecksTypeState =
  | {
      value: 'uninitialized';
      context: WithDataStream;
    }
  | {
      value: 'planning';
      context: WithDataStream;
    }
  | {
      value: 'planned';
      context: WithDataStream & WithPlan;
    }
  | {
      value: 'unplanned';
      context: WithDataStream & WithPlanningError;
    }
  | {
      value: 'checking';
      context: WithDataStream & WithPlan & WithCheckProgress;
    }
  | {
      value: 'unchecked';
      context: WithDataStream & WithPlan & WithCheckingError;
    };

interface WithDataStream {
  dataStream: string;
}

interface WithPlan {
  plan: CheckPlan;
}

interface WithPlanningError {
  planningError: string;
}

interface WithCheckProgress {
  checkProgress: DataStreamQualityCheckProgress[];
}

interface WithCheckingError {
  checkingError: string;
}

export type DataStreamQualityChecksContext = DataStreamQualityChecksTypeState['context'];

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
      plan: CheckPlan;
    }
  | {
      type: `${ActionTypes.DoneInvoke}.performAllChecks`;
    };

export type DataStreamQualityCheckProgress =
  | {
      progress: 'pending';
      id: string;
    }
  | {
      progress: 'finished';
      id: string;
      execution: DataStreamQualityCheckExecution;
    };
