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
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAsjVVBlQPYB2AdBW6hFQ5RG6Zq06wAxBE5guggG5sA1nJjoRY0RIDaABgC6iUAAc2sJp2MgAHogCsAZi4AOAJx6AbI5eO9Adjc3AEZggBYAGhBaRGD-Zz1ExMd7ACZgvVT7f1SAX1yotEwcfCIyShoGJhZtbl5+QWFq8Q4pGQ45RRU1MA1m2tgdYKMkEDMLWus7BABaVO9XVL1HT1T05fng+yiYhDiEpOW0jKz-fMKMbDwCEnJqOk0a9m4AC1RYR5apAGNOADNmKR8J9avoRqZzJYOFNYnEuAEXHpsmFPCEQqidogVm54fY3IE9PjjvNziAildSrcKg9+s8uKgTCYKLRGiDntJZPIOEpVPTGcy2ZwwdZxlCYXslosXMF5o5-C4XKk3GlMQhEZ54YcUutTqTySUbuV7lVRE9OHymSyhIKOJIwLhcGxcFwmRg-k7CBaBbShYYRZDJqNpmFggkXHivG5FWF0m5VZ5-P4uInHGEkY5laFPHrLgayndKjauG9YAA5Ng2qQAjhUWAvYWjUWB0DTGb7Lj2Vb2MJy8PBDxuSLRWJeDVhIJRzzd+JeHPFa756kmrR0hlMqiQG2Sau1+t+xsB57i0JJzyeNOecL9vTSlKq5X2VzBTyKvRhfxhBU3ucUw0Fmmmi0XB-KgVAUJuPq2vgeC0A2EITEeQaIAmYRcOESLnuGIZyv4qphI+E5BP4wQuN4nahD+eZUsaRYgWBEGAbU26CLucFjIeVhIQgCbBFw3jzKR9hONkcSqhkZ5cOOQSCe+firJRC7UYWkFcL8HAAlAQKspBkhrt6jHPGxTaIS2sSpq4iqKh+bhyl49jBKq2Q4vYWrHJk2QKZSRrKQZ5pqRpWnWjp0FAhwRkcdCXFps5Wz2NKJFxC5pGqqk-gaqlqZ4omg4Kv49j5AUIAcGwEBwNY+qKd5AErpx8FilxMyOKEizLKs6yOJs2zDrMISaokoQdRm-hvsEnl-kuRb1AIQW+a0-oIbVtjIXofV6KGfiBCE4Sqo1kmEee8r4jGipjYuNEqSWlbzfVpl7BmfHKk1bhLD2U7PSlQSrUcOrZPlhUVV5-7Lma3B6VaTSzddzZLQgTgduGUYkWth0ZvGeUdq5P1nP9uaVUDRYluWV0HgtkW3XMa1cB1rX4eh-ZBB9OKHN9Jy-adSnVSDXDtGAUMmTDV5Uykypvp2hJxt14mPlkSTaqz2MXPOgMTSpekbhANp84t0yhitCLhDkSw3qkTWqu4qRfXL7kK2SuPK+ds3AaB4Ea5BWtkzD3hJjecWONiCrpA53Woi4XCEblg0m39iu-mdPk1dw-mArg2mQyTN0C1saGfvhLjyqsH5KnhCpcDLiQuGmftxHEBW5EAA */
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
            onDone: 'appliedMitigation',
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
              actions: 'clearCurrentMitigation',
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
      applyMitigation: async (context, event): Promise<void> => {
        if (event.type !== 'applyMitigation') {
          return;
        }

        const {
          mitigation: { data_stream: dataStream, ...mitigationParams },
        } = event;
        await dataStreamQualityClient.applyMitigation(dataStream, mitigationParams);
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
}

export interface DataStreamQualityMitigationServices {
  [service: string]: {
    data: any;
  };
  getMitigations: {
    data: MitigationForCause[];
  };
  applyMitigation: {
    data: null;
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
      type: `${ActionTypes.DoneInvoke}.applyMitigations`;
    }
  | {
      type: `${ActionTypes.ErrorPlatform}.applyMitigations`;
    };

export type DataStreamQualityMitigationInterpreter = InterpreterFrom<
  typeof createDataStreamQualityMitigationStateMachine
>;
