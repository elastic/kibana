/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformActionParams } from './transform_action_params';

test('skips non string parameters', () => {
  const actionParams = {
    boolean: true,
    number: 1,
    empty1: null,
    empty2: undefined,
    date: '2019-02-12T21:01:22.479Z',
  };
  const result = transformActionParams({
    actionParams,
    context: {},
    state: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "boolean": true,
          "date": "2019-02-12T21:01:22.479Z",
          "empty1": null,
          "empty2": undefined,
          "number": 1,
        }
    `);
});

test('missing parameters get emptied out', () => {
  const actionParams = {
    message1: '{{context.value}}',
    message2: 'This message "{{context.value2}}" is missing',
  };
  const result = transformActionParams({
    actionParams,
    context: {},
    state: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "message1": "",
          "message2": "This message \\"\\" is missing",
        }
    `);
});

test('context parameters are passed to templates', () => {
  const actionParams = {
    message: 'Value "{{context.foo}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: { foo: 'fooVal' },
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"fooVal\\" exists",
        }
    `);
});

test('state parameters are passed to templates', () => {
  const actionParams = {
    message: 'Value "{{state.bar}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: { bar: 'barVal' },
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "message": "Value \\"barVal\\" exists",
        }
    `);
});

test('alertId is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{alertId}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"1\\" exists",
    }
  `);
});

test('alertName is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{alertName}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"alert-name\\" exists",
    }
  `);
});

test('tags is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{tags}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"tag-A,tag-B\\" exists",
    }
  `);
});

test('undefined tags is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{tags}}" is undefined and renders as empty string',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"\\" is undefined and renders as empty string",
    }
  `);
});

test('empty tags is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{tags}}" is an empty array and renders as empty string',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: [],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"\\" is an empty array and renders as empty string",
    }
  `);
});

test('spaceId is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{spaceId}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"spaceId-A\\" exists",
    }
  `);
});

test('alertInstanceId is passed to templates', () => {
  const actionParams = {
    message: 'Value "{{alertInstanceId}}" exists',
  };
  const result = transformActionParams({
    actionParams,
    state: {},
    context: {},
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
    Object {
      "message": "Value \\"2\\" exists",
    }
  `);
});

test('works recursively', () => {
  const actionParams = {
    body: {
      message: 'State: "{{state.value}}", Context: "{{context.value}}"',
    },
  };
  const result = transformActionParams({
    actionParams,
    state: { value: 'state' },
    context: { value: 'context' },
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "message": "State: \\"state\\", Context: \\"context\\"",
          },
        }
    `);
});

test('works recursively with arrays', () => {
  const actionParams = {
    body: {
      messages: ['State: "{{state.value}}", Context: "{{context.value}}"'],
    },
  };
  const result = transformActionParams({
    actionParams,
    state: { value: 'state' },
    context: { value: 'context' },
    alertId: '1',
    alertName: 'alert-name',
    tags: ['tag-A', 'tag-B'],
    spaceId: 'spaceId-A',
    alertInstanceId: '2',
  });
  expect(result).toMatchInlineSnapshot(`
        Object {
          "body": Object {
            "messages": Array [
              "State: \\"state\\", Context: \\"context\\"",
            ],
          },
        }
    `);
});
