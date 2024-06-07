/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseFormFieldsSchemaWithOptionalLabel } from './schema';

describe('Template schema', () => {
  describe('CaseFormFieldsSchemaWithOptionalLabel', () => {
    it('has label append for each field', () => {
      expect(CaseFormFieldsSchemaWithOptionalLabel).toMatchInlineSnapshot(`
      Object {
        "assignees": Object {
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
        },
        "category": Object {
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
        },
        "description": Object {
          "label": "Description",
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
          "validations": Array [
            Object {
              "validator": [Function],
            },
          ],
        },
        "severity": Object {
          "label": "Severity",
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
        },
        "tags": Object {
          "helpText": "Separate tags with a line break.",
          "label": "Tags",
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
          "validations": Array [
            Object {
              "isBlocking": false,
              "type": "arrayItem",
              "validator": [Function],
            },
            Object {
              "isBlocking": false,
              "type": "arrayItem",
              "validator": [Function],
            },
            Object {
              "validator": [Function],
            },
          ],
        },
        "title": Object {
          "label": "Name",
          "labelAppend": <EuiText
            color="subdued"
            data-test-subj="form-optional-field-label"
            size="xs"
          >
            Optional
          </EuiText>,
          "validations": Array [
            Object {
              "validator": [Function],
            },
          ],
        },
      }
      `);
    });
  });
});
