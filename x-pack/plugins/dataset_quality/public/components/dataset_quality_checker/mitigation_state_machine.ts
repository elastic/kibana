/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMachine, assign, ActionTypes } from 'xstate';
import { CheckTimeRange, MitigationForCause, QualityProblemParams } from '../../../common';
import { IDataStreamQualityClient } from '../../services/data_stream_quality';

export const createPureDataStreamQualityMitigationStateMachine = (
  initialContext: DataStreamQualityMitigationContext
) =>
  createMachine(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAsjVVBlQPYB2AdBW6hFQ5RG6Zq06wAxBE5guggG5sA1nJjoRY0RIDaABgC6iUAAc2sJp2MgAHogCsAZi4AOAJx6AbI5eO9Adjc3AEZggBYAGhBaRGD-Zz1ExMd7ACZgvVT7f1SAX1yotEwcfCIyShoGJhZtbl5+QWFq8Q4pGQ45RRU1MA1m2tgdYKMkEDMLWus7BABaVO9XVL1HT1T05fng+yiYhDiEpOW0jKz-fMKMbDwCEnJqOk0a9m4AC1RYR5apVBMTCirRE9OPoRqZzJYOFNYo4wq4XKkXMEsjtEI5-PYuPZDil1qd7OcQEUrqVbhUHv1nlwfn9aI1PrVpLJ5BwlKoqb9-vTniDrOMIVC9ktFoi9G5-GEkRk3JFog5pVxDkdcdkCUSSjdyvcAVpKdT-nSKZxJGBcLg2LguH8MAAzc2Edk0rnAwy88GTUbTCXBBUueweTxueFhdJuFEIML+b3+eKONzeZKeQL4gqEy7qsp3SpO17vABybGzUmtgiosBePNGfPdoGmM32mNW9jCbhWoTCTZlu193ubQRcnib8T0ftVaeuGbJ2qB3D1VEg2ckxY4pfLLsrbueAri3r8YUTawl62lYf8nhcmOxx0yKpTavHpK12a41tQVAo88NHEk+DwtArYImTcPUQRNYXCYdPDCX0JTRfww3bLggiQyN+xSTxQlHYp701LNP2fV93wgBclxXf8xg3KxgIQRNvW8VJ-ERQNUmDYJQ1lBBuwvJIcROG8Uw4NgIDgaw7xJHDyUBFpXUAyia0QGZHFCRZllWdZHE2bZ2JmDxEKQtx7EgiMXCMzDiQ1TMJJ1TgeD4AQhELaT+Sozw9AVJJgkcPxAhCcIwwUrheyCSCGLFYN4VM9MH1wyTai4N4Pk-eB1xkyEqI8twuADJxWKWMIVj9VIw1SII3O4q88Qi7CLKnFoHX1ezP0c6tbAcZx7F9Ft0XggMuOScrsmTC4sLE6qn3i-MHOSpy5NmJYdyWFZhxcRJ0MyIqSsVHjr3RSqRsnJ92jAJqgJm8IdxSNw1mYyVRU7RBfVcrIyuVM5bzHPbHzw2cPxik7yJSrc-AVBipXFG7j3Ys8Dme3jXqGsyJ0+37rJfN8fqs1KAOmlrqLRH0-S8JiWLY3Zm2hvqXuTfIgA */
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
            applyMitigation: 'applyingMitigation',
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
      actions: {
        storeMitigations: assign((context, event) => {
          if (event.type !== (`${ActionTypes.DoneInvoke}.getMitigations` as const)) {
            return context;
          }

          return {
            mitigations: event.data,
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
  }).withConfig({
    services: {
      getMitigations: async (
        context,
        event
      ): Promise<DataStreamQualityMitigationServices['getMitigations']['data']> => {
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
                data_stream: 'logs-custom_2-default',
                field: 'message',
              },
              {
                type: 'pipeline-truncate-value',
                data_stream: 'logs-custom_2-default',
                field: 'message',
              },
              {
                type: 'pipeline-remove-field',
                data_stream: 'logs-custom_2-default',
                field: 'message',
              },
            ],
          },
        ];
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
      type: `${ActionTypes.ErrorPlatform}.applyMitigations`;
    };
