/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes, assign, createMachine, InterpreterFrom, pure } from 'xstate';
import {
  CheckTimeRange,
  Mitigation,
  MitigationExecution,
  MitigationForCause,
  QualityProblemCause,
  QualityProblemParams,
} from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';

const dataStreamQualityMitigationStateMachineId = 'DataStreamQualityMitigation';

export const createPureDataStreamQualityMitigationStateMachine = (
  initialContext: DataStreamQualityMitigationContext
) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAsjVVBlQPYB2AdBW6hFQ5RG6Zq06wAxBE5guggG5sA1nJjoRY0RIDaABgC6iUAAc2sJp2MgAHogCsAZi4AOAJx6AbI5eO9Adjc3AEZggBYAGhBaRGD-Zz1ExMd7ACZgvVT7f1SAX1yotEwcfCIyShoGJhZtbl5+QWFq8Q4pGQ45RRU1MA1m2tgdYKMkEDMLWus7BABaVO9XVL1HT1T05fng+yiYhDiEpOW0jKz-fMKMbDwCEnJqOk0a9m4AC1RYR5apAGNOADNmKR8J9avoRqZzJYOFNYnEuAEXHpsmFPCEQqidogVm54fY3IE9PjjvNziAildSrcKg9+s8uKgTCYKLRGiDntJZPIOEpVPTGcy2ZwwdZxlCYXsMlx-GE1jLUmFHOkUi5MQh-C5gvD-MtHP4tp4DakzgUyZcSjdyvcqqInpw+UyWUJBRxJGBcLg2LguEyMH9PYR7QLaULDCLIZNRtMwsEEi48V43C55ek3KrPP5-FL4mEkY43PZQp5SeTzWU7pVnVw3rAAHJsZ1SAEcKiwF7C0aiiOgaYzfZceyrewK9UFjxuSLRWJeTxcMJBROeIfxLzFs3XMvU61aOkMplUSDOyRNltt0Md8PPcWhTWKjU+PyBELhVVuFauYKeJN6MLSlyIlyrsU65UlalZ-KgVAUAewYuvgeC0O2EITJekaIOmYRcOESKeGEcbRrq-iqmE9hcPOQR6i43gDqEgEUha5Y0jaLRcOBkHQUxtRHoIJ6IWMF5WKhCDppq3jzJR9hONkcSqhkBqzvO4k-n4qy0aWIEVjBXC-BwAJQECrIwZIu5Bhxzy8Z2KHdrEjgYX+qRJtKr7aouwSqtkOL2IcKTrKcqnAZaGmmXa2m6fpTqGXBQIcOZ-HQoJOYeVs9gasEGr+J5lGqkaM5GjZeIZuOf7pfkJocGwEBwNYJb+QxW62nFSFioJMyOKEizLKs6yKp4WyqjMHikWROHqviMoASa1WUgFjHbna9QCOFQWtGGyECVZQl6PCSQxg+QShBOuwtfJ87De40r2XkE1rlNtWVtWDYrU160xjiqJOMEbhLAqi6fVlQRbUk3knNk9h+Tdm6VsZjpNEtj1drYDjOMleIaoicTuHmabpf2XnHJk2Rg-REOadWdYPeeq0NQjsxLDeSwrMRWEfUEf04ocRw+SDhMbqBmntGAcOWdT4Q3ik+bfgOhKppOexeCRWSA3jvlXUB4O80tgb7hAzqC2twt+FqGo-msiRJq1qruKkAPJErBMq3RPOBbN3CsVB2swbrVPTN4mZ6HGvjYnZoRpomg1BEViqR6D9tqdNdXMSFgK4AZsMU09wtbJhuHES46qrOd0u7LhLhcArps5o4rV6sa+RAA */
      context: initialContext,
      predictableActionArguments: true,
      id: dataStreamQualityMitigationStateMachineId,
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
                actions: 'storeMitigations',
              },
              {
                target: 'hasNoMitigations',
                actions: 'storeMitigations',
              },
            ],
          },

          entry: ['clearMitigations', 'clearErrors'],
        },

        hasMitigations: {
          on: {
            configureMitigation: {
              target: 'configuringMitigation',
              actions: 'storeCurrentMitigation',
            },
          },
        },

        applyingMitigation: {
          invoke: {
            src: 'applyMitigation',
            id: 'applyMitigation',
            onDone: {
              target: 'appliedMitigation',
              actions: 'storeMitigationExecution',
            },
            onError: {
              target: 'failedMitigation',
              actions: 'storeApplicationError',
            },
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
            finish: {
              target: 'done',
              actions: ['clearCurrentMitigation', 'clearMitigationExecution'],
            },
          },
        },

        failedMitigation: {
          on: {
            retry: 'loadingMitigations',
            finish: 'done',
          },
        },

        configuringMitigation: {
          on: {
            applyMitigation: 'applyingMitigation',
            return: {
              target: 'hasMitigations',
              actions: 'clearCurrentMitigation',
            },
          },
        },
      },
    },
    {
      actions: {
        clearErrors: pure(() => []),
        clearMitigations: assign((context, event) => ({
          mitigations: [],
        })),
        storeMitigations: assign((context, event) => {
          if (event.type !== (`${ActionTypes.DoneInvoke}.getMitigations` as const)) {
            return context;
          }

          return {
            mitigations: event.data,
          };
        }),
        clearCurrentMitigation: assign((context, event) => {
          return {
            currentMitigation: null,
          };
        }),
        storeCurrentMitigation: assign((context, event) => {
          if (event.type !== 'configureMitigation') {
            return context;
          }

          return {
            currentMitigation: {
              cause: event.cause,
              mitigation: event.mitigation,
            },
          };
        }),
        clearMitigationExecution: assign((context, event) => {
          return {
            latestMitigationExecution: null,
          };
        }),
        storeMitigationExecution: assign((context, event) => {
          if (event.type !== (`${ActionTypes.DoneInvoke}.applyMitigation` as const)) {
            return context;
          }

          return {
            latestMitigationExecution: event.data,
          };
        }),
      },
      guards: {
        hasMitigations: (context, event) =>
          event.type === (`${ActionTypes.DoneInvoke}.getMitigations` as const) &&
          event.data.length > 0,
      },
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
    mitigations: [],
    currentMitigation: null,
    latestMitigationExecution: null,
  }).withConfig({
    services: {
      getMitigations: async (
        context,
        event
      ): Promise<DataStreamQualityMitigationServices['getMitigations']['data']> => {
        const {
          parameters: { dataStream },
        } = context;
        return [
          {
            cause: {
              type: 'value-too-large',
              field: 'message',
              limit: 1024,
              values: ['123', '457'],
            },
            mitigations: [
              {
                type: 'mapping-increase-ignore-above',
                data_stream: dataStream,
                field: 'message',
                limit: 2048,
              },
              {
                type: 'pipeline-truncate-value',
                data_stream: dataStream,
                field: 'message',
                limit: 2048,
              },
              {
                type: 'pipeline-remove-field',
                data_stream: dataStream,
                field: 'message',
              },
            ],
          },
        ];
      },
      applyMitigation: async (
        context,
        event
      ): Promise<DataStreamQualityMitigationServices['applyMitigation']['data']> => {
        if (event.type !== 'applyMitigation') {
          throw new Error('Invalid event');
        }

        const {
          mitigation: { data_stream: dataStream, ...mitigationParams },
        } = event;
        return await dataStreamQualityClient.applyMitigation(dataStream, mitigationParams);
      },
    },
  });

interface Parameters {
  dataStream: string;
  timeRange: CheckTimeRange;
  problem: QualityProblemParams;
}

export interface DataStreamQualityMitigationContext {
  parameters: Parameters;
  mitigations: MitigationForCause[];
  currentMitigation: { cause: QualityProblemCause; mitigation: Mitigation } | null;
  latestMitigationExecution: MitigationExecution | null;
}

export interface DataStreamQualityMitigationServices {
  [service: string]: {
    data: any;
  };
  getMitigations: {
    data: MitigationForCause[];
  };
  applyMitigation: {
    data: MitigationExecution;
  };
}

export type DataStreamQualityMitigationEvent =
  | {
      type: 'configureMitigation';
      cause: QualityProblemCause;
      mitigation: Mitigation;
    }
  | {
      type: 'applyMitigation';
      cause: QualityProblemCause;
      mitigation: Mitigation;
    }
  | {
      type: 'return';
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
      type: `${ActionTypes.DoneInvoke}.applyMitigation`;
      data: DataStreamQualityMitigationServices['applyMitigation']['data'];
    }
  | {
      type: `${ActionTypes.ErrorPlatform}.applyMitigation`;
    };

export type DataStreamQualityMitigationInterpreter = InterpreterFrom<
  typeof createDataStreamQualityMitigationStateMachine
>;
