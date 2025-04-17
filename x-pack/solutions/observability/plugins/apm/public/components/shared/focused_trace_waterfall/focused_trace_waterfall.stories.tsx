/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { FocusedTraceWaterfall } from '.';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';

type TraceItems = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>;

const stories: Meta<any> = {
  title: 'app/TransactionDetails/focusedTraceWaterfall',
  component: FocusedTraceWaterfall,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook routePath="/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=testTransactionName">
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const Example: StoryFn<any> = () => {
  return <FocusedTraceWaterfall items={data} />;
};

const data: TraceItems = {
  traceItems: {
    rootTransaction: {
      service: {
        environment: 'dev',
        name: 'products-server-classic-apm',
      },
      transaction: {
        duration: {
          us: 7087,
        },
        result: 'HTTP 2xx',
        type: 'request',
        id: '3383bc5055a6ae91',
        name: 'POST /products/:id/buy',
      },
      span: {
        id: '3383bc5055a6ae91',
        links: [],
      },
      timestamp: {
        us: 1743790903871005,
      },
      trace: {
        id: '9733815865d7f9aedcacd0893fbaa1fb',
      },
      processor: {
        event: 'transaction',
      },
      agent: {
        name: 'nodejs',
      },
      event: {
        outcome: 'success',
      },
    },
    parentDoc: {
      service: {
        environment: 'dev',
        name: 'products-server-classic-apm',
      },
      span: {
        action: 'POST',
        name: 'POST localhost:8080',
        id: 'b1d5ad707d1a2d36',
        subtype: 'http',
        sync: false,
        type: 'external',
        duration: {
          us: 5891,
        },
        destination: {
          service: {
            resource: 'localhost:8080',
          },
        },
        links: [],
      },
      transaction: {
        id: '3383bc5055a6ae91',
      },
      timestamp: {
        us: 1743790903871622,
      },
      trace: {
        id: '9733815865d7f9aedcacd0893fbaa1fb',
      },
      processor: {
        event: 'span',
      },
      agent: {
        name: 'nodejs',
      },
      parent: {
        id: '3383bc5055a6ae91',
      },
      event: {
        outcome: 'success',
      },
    },
    focusedTraceDoc: {
      service: {
        environment: 'dev',
        name: 'payments-server-classic-apm',
      },
      transaction: {
        duration: {
          us: 4298,
        },
        result: 'HTTP 2xx',
        type: 'request',
        id: '86682e13644e14b9',
        name: 'PaymentsController#processPayment',
      },
      span: {
        id: '86682e13644e14b9',
        links: [],
      },
      timestamp: {
        us: 1743790903873047,
      },
      trace: {
        id: '9733815865d7f9aedcacd0893fbaa1fb',
      },
      processor: {
        event: 'transaction',
      },
      agent: {
        name: 'java',
      },
      parent: {
        id: 'b1d5ad707d1a2d36',
      },
      event: {
        outcome: 'success',
      },
    },
    focusedTraceTree: [
      {
        traceDoc: {
          service: {
            environment: 'dev',
            name: 'payments-server-classic-apm',
          },
          span: {
            name: 'POST localhost',
            id: 'ffe79ff737e435cf',
            subtype: 'http',
            type: 'external',
            duration: {
              us: 1870,
            },
            destination: {
              service: {
                resource: 'localhost:4001',
              },
            },
            links: [],
          },
          transaction: {
            id: '86682e13644e14b9',
          },
          timestamp: {
            us: 1743790903874690,
          },
          trace: {
            id: '9733815865d7f9aedcacd0893fbaa1fb',
          },
          processor: {
            event: 'span',
          },
          agent: {
            name: 'java',
          },
          parent: {
            id: '86682e13644e14b9',
          },
          event: {
            outcome: 'success',
          },
        },
        children: [
          {
            traceDoc: {
              service: {
                environment: 'dev',
                name: 'dispatch-server-classic-apm',
              },
              transaction: {
                duration: {
                  us: 22,
                },
                result: 'HTTP 2xx',
                type: 'request',
                id: 'bb0397cdea74db7c',
                name: 'POST /dispatch/{id}',
              },
              span: {
                id: 'bb0397cdea74db7c',
                links: [],
              },
              timestamp: {
                us: 1743790903876709,
              },
              trace: {
                id: '9733815865d7f9aedcacd0893fbaa1fb',
              },
              processor: {
                event: 'transaction',
              },
              agent: {
                name: 'go',
              },
              parent: {
                id: 'ffe79ff737e435cf',
              },
              event: {
                outcome: 'success',
              },
            },
            children: [],
          },
        ],
      },
    ],
  },
  summary: {
    services: 1,
    traceEvents: 1,
    errors: 0,
  },
};
