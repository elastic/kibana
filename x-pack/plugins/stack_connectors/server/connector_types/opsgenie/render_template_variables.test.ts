/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpsgenieSubActions } from '../../../common';
import { renderParameterTemplates } from './render_template_variables';

const ruleTagsTemplate = '{{rule.tags}}';

describe('renderParameterTemplates', () => {
  const variables = {
    rule: {
      tags: ['tag1', 'tag2'],
    },
  };

  it('renders the rule.tags as a single string if subAction is not set to CreateAlert', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: '',
          subActionParams: {
            tags: [ruleTagsTemplate],
          },
        },
        variables
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "",
        "subActionParams": Object {
          "tags": Array [
            "tag1,tag2",
          ],
        },
      }
    `);
  });

  it('does not transform the tags if the rule.tags string is not found', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: ['a tag'],
          },
        },
        variables
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "a tag",
          ],
        },
      }
    `);
  });

  it('transforms the rule.tags to an empty array when the field does not exist in the variable', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: [ruleTagsTemplate],
          },
        },
        {}
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [],
        },
      }
    `);
  });

  it('does not transform the tags when the field does not exist in the params', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {},
        },
        {}
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {},
      }
    `);
  });

  it('replaces the rule.tags template with an array of strings', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: [ruleTagsTemplate],
          },
        },
        {
          rule: {
            tags: ['tag1', 'tag2'],
          },
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "tag1",
            "tag2",
          ],
        },
      }
    `);
  });

  it('replaces the rule.tags template with only a single instance of the rule.tags even when the mustache template exists multiple times', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: [ruleTagsTemplate, 'a tag', ruleTagsTemplate],
          },
        },
        {
          rule: {
            tags: ['tag1', 'tag2'],
          },
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "a tag",
            "tag1",
            "tag2",
          ],
        },
      }
    `);
  });

  it('replaces the rule.tags template with empty array and preserves the other values already in the array', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: ['a tag', ruleTagsTemplate],
          },
        },
        {
          rule: {},
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "a tag",
          ],
        },
      }
    `);
  });

  it('replaces the rule.tags template with variable value when the path is a full string', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: ['a tag', ruleTagsTemplate],
          },
        },
        {
          'rule.tags': ['super tag'],
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "a tag",
            "super tag",
          ],
        },
      }
    `);
  });

  it('replaces the rule.tags template and other templates', () => {
    expect(
      renderParameterTemplates(
        {
          subAction: OpsgenieSubActions.CreateAlert,
          subActionParams: {
            tags: ['a tag', ruleTagsTemplate, '{{rule.other}}'],
          },
        },
        {
          'rule.tags': ['super tag'],
          rule: {
            other: 5,
          },
        }
      )
    ).toMatchInlineSnapshot(`
      Object {
        "subAction": "createAlert",
        "subActionParams": Object {
          "tags": Array [
            "a tag",
            "5",
            "super tag",
          ],
        },
      }
    `);
  });
});
