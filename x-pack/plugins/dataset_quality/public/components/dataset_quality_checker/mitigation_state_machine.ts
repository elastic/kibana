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
      /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtgIoCuqANgJboCeAsjVVBlQPYB2AdBW6hFQ5RG6Zq06wAxBE5guggG5sA1nJjoRY0RIDaABgC6iUAAc2sJp2MgAHogCsAZi4AOAJx6AbI5eO9Adjc3AEZggBYAGhBaRGD-Zz1ExMd7ACZgvVT7f1SAX1yotEwcfCIyShoGJhZtbl5+QWFq8Q4pGQ45RRU1MA1m2tgdYKMkEDMLWus7BABaVO9XVL1HT1T05fng+yiYhDiEpOW0jKz-fMKMbDwCEnJqOk0a9m4AY04AM2ZSXEbHlslUCYTBQqqInpx9CNTOZLBwprFHGFXC5Uij-GE3I5-F57MEdg5Alx7IcUutTucQEUrqVbhUHv1nlxAcDaL8GZxpLJ5BwlKomUCQX9apDrONYfC9ktFi5gvMsS4UW40viEC4vFxDkcydkKVSSjdyvdQVpGcyQWywf8wLhcGxcFxgRh3nbCPyWULniLRmLJqNpmFggkXPYPJ43Ciwuk3CrPP5-Fw44i9E4laFPLrLvqyndKh7OFwABaoWAAOTYedakk+HCosALXuhE2eEpm+yJq3sYXluI8bki0ViXk8XAxQRcnk78S8GeK12zdON4O4ZqokArVcEtfrhlFMN9oGmcWCXD8YWxqxSaVSkZVbkJxKSpJOOoKlMzc9pRorXHeqCoFDXdkOEkfA8FoBsxj3Zs-UQWMkXCZNPDCYMAyxfwVTCewuCCHD-GCccUk8UIZ2pA0c3pS1ah-P8AIgddqy3CCfWgg9YLwrhvHmcd7CcbI4hVDJPGHUdwwnM8-FWEis0-XMgMLYsKykN4OE+KBvjACsmKgqwYMlPQNWDJUXH8cdUnRRxUhVRwPC4LIkhcMJlkcI8zlfPUP0NWTKMZZTVO+C0TQ5UDvg4LSmx01iEBSZw0kRexjNM8yVVSIINUOBynJc-JXw4NgIDgax3JpTyKMCuFvW08rIpmZzjxRZZVnWCyiO2AdZhsnCgiQky70jFwpI88jFxaHg+AEIRFN3cKqtsWD9MOQM-ECEJwhVGqR067r3HRVE8jc99iqG78i1gSaKumiVAzcDilWctwli7Cd7uS1LNSfTJsnsAbDoXb8zVZCagKm8VdKcIlDJlNU4ncayY38LCH2SY4Ptci5Zx+r85JOsszsbEHqqWY8LIazCEOCHCXuut7kdOL79vRsjfrk9owGB-dZr2AMTxSJU9Ewzw9CCAScVsxH3vJenSPnTHvPzFdANlmbmIijnA3mkzwhyJY9BRZyVXcVI0sfGmXzRqWZNKpdqP-BWyrZliOe8eMdfixwVnDFFQhjcNsJwhV4lSCyUm+xmZbKrhfK+H5AcV+2VcPLYuHCBz4pM1YdujNrkJcUX7Mct2suyoA */
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
            configureMitigation: 'configuringMitigation',
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

        configuringMitigation: {
          on: {
            applyMitigation: 'applyingMitigation',
            return: 'hasMitigations',
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
                limit: 2048,
              },
              {
                type: 'pipeline-truncate-value',
                data_stream: 'logs-custom_2-default',
                field: 'message',
                limit: 2048,
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
      applyMitigation: async (): Promise<void> => {
        return;
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
  currentMitigation: Mitigation | null;
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
