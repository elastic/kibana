/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CelInputState } from '../../server/types';

export const celTestState: CelInputState = {
  dataStreamName: 'testDataStream',
  lastExecutedChain: 'testchain',
  finalized: false,
  apiQuerySummary: 'testQuerySummary',
  currentProgram: 'testProgram',
  stateVarNames: ['testVar'],
  stateSettings: { test: 'testDetails' },
  configFields: { test: { config1: 'config1testDetails' } },
  redactVars: ['testRedact'],
  results: { test: 'testResults' },
  path: './testPath',
  authType: 'basic',
  openApiPathDetails: {},
  openApiSchemas: {},
  openApiAuthSchema: {},
  hasProgramHeaders: false,
};

export const celQuerySummaryMockedResponse = `To cover all events in a chronological manner for the device_tasks endpoint, you should use the /v1/device_tasks GET route with pagination parameters. Specifically, use the pageSize and pageToken query parameters. Start with a large pageSize and use the nextPageToken from each response to fetch subsequent pages until all events are retrieved.
Sample URL path:
/v1/device_tasks?pageSize=1000&pageToken={nextPageToken}
Replace {nextPageToken} with the actual token received from the previous response. Repeat this process, updating the pageToken each time, until you've retrieved all events.`;

export const celProgramMockedResponse = `Based on the provided context and requirements, here's the CEL program section for the device_tasks datastream:

\`\`\`
request("GET", state.url + "/v1/device_tasks" + "?" + {
    "pageSize": [string(state.page_size)], 
    "pageToken": [state.page_token]
}.format_query()).with({
    "Header": {
        "Content-Type": ["application/json"]
    }
}).do_request().as(resp, 
    resp.StatusCode == 200 ? 
    bytes(resp.Body).decode_json().as(body, {
        "events": body.tasks.map(e, {"message": e.encode_json()}),
        "page_token": body.nextPageToken, 
        "want_more": body.nextPageToken != null
    }) : {
        "events": {
            "error": {
                "code": string(resp.StatusCode),
                "message": string(resp.Body)
            }
        },
        "want_more": false
    }
)
\`\`\``;

export const celProgramMock = `request("GET", state.url + "/v1/device_tasks" + "?" + {
    "pageSize": [string(state.page_size)], 
    "pageToken": [state.page_token]
}.format_query()).with({
    "Header": {
        "Content-Type": ["application/json"]
    }
}).do_request().as(resp, 
    resp.StatusCode == 200 ? 
    bytes(resp.Body).decode_json().as(body, {
        "events": body.tasks.map(e, {"message": e.encode_json()}),
        "page_token": body.nextPageToken, 
        "want_more": body.nextPageToken != null
    }) : {
        "events": {
            "error": {
                "code": string(resp.StatusCode),
                "message": string(resp.Body)
            }
        },
        "want_more": false
    }
)`;

export const celStateVarsMockedResponse = ['config1', 'config2', 'config3'];

export const celStateDetailsMockedResponse = [
  {
    name: 'config1',
    default: 50,
    redact: false,
    configurable: true,
    description: 'config1 description',
    type: 'number',
  },
  {
    name: 'config2',
    default: '',
    redact: true,
    configurable: false,
    description: 'config2 description',
    type: 'string',
  },
  {
    name: 'config3',
    default: 'event',
    redact: false,
    configurable: false,
    description: 'config3 description',
    type: 'string',
  },
];

export const celStateSettings = {
  config1: 50,
  config2: '',
  config3: 'event',
};

export const celConfigFields = {
  config1: {
    default: 50,
    type: 'number',
    description: 'config1 description',
  },
};

export const celRedact = ['config2'];

export const celExpectedResults = {
  program: celProgramMock,
  stateSettings: {
    config1: 50,
    config2: '',
    config3: 'event',
  },
  configFields: {
    config1: {
      default: 50,
      type: 'number',
      description: 'config1 description',
    },
  },
  needsAuthConfigBlock: false,
  redactVars: ['config2'],
};
