/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const celTestState = {
  dataStreamName: 'testDataStream',
  apiDefinition: 'apiDefinition',
  lastExecutedChain: 'testchain',
  finalized: false,
  apiQuerySummary: 'testQuerySummary',
  exampleCelPrograms: [],
  currentProgram: 'testProgram',
  stateVarNames: ['testVar'],
  stateSettings: { test: 'testDetails' },
  redactVars: ['testRedact'],
  results: { test: 'testResults' },
};

export const celQuerySummaryMockedResponse = ``;

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
    description: "config1's description",
    redact: false,
    type: 'integer',
    configurable: true,
  },
  {
    name: 'config2',
    default: '',
    description: "config2's description",
    redact: true,
    type: 'text',
    configurable: false,
  },
  {
    name: 'config3',
    default: 'event',
    description: "config3's description",
    redact: false,
    type: 'text',
    configurable: false,
  },
];

export const celStateSettings = {
  config1: 50,
  config2: '',
  config3: 'event',
};

export const celRedact = ['config2'];

export const celExpectedResults = {
  program: celProgramMock,
  stateSettings: {
    config1: 50,
    config2: '',
    config3: 'event',
  },
  redactVars: ['config2'],
};
