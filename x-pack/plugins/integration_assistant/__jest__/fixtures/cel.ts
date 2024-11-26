/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// todo update
export const celTestState = {
  dataStreamName: 'testDataStream',
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
  },
  {
    name: 'config2',
    default: '',
    redact: true,
  },
  {
    name: 'config3',
    default: 'event',
    redact: false,
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
