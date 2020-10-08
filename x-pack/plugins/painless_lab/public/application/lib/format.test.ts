/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PayloadFormat } from '../types';
import { formatRequestPayload } from './format';

describe('formatRequestPayload', () => {
  Object.values(PayloadFormat).forEach((format) => {
    describe(`${format} formats`, () => {
      test('no script', () => {
        expect(formatRequestPayload({}, format)).toMatchSnapshot();
      });

      test('a single-line script', () => {
        const code = 'return "ok";';
        expect(formatRequestPayload({ code }, format)).toMatchSnapshot();
      });

      test('a complex multi-line script', () => {
        const code = `// Here's a comment and a variable, then a loop.
double halfWidth = Math.floor(width * 0.5);
for (int y = 0; y < height; y++) {
  return "results here\\\\n";
}

return result;`;
        expect(formatRequestPayload({ code }, format)).toMatchSnapshot();
      });

      test('code and parameters', () => {
        const code = 'return "ok";';
        const parameters = `{
  "a": {
    "b": "c",
    "d": "e"
  }
}`;
        expect(formatRequestPayload({ code, parameters }, format)).toMatchSnapshot();
      });

      test('code, parameters, and context', () => {
        const code = 'return "ok";';
        const parameters = `{
  "a": {
    "b": "c",
    "d": "e"
  }
}`;
        const context = 'filter';
        expect(formatRequestPayload({ code, parameters, context }, format)).toMatchSnapshot();
      });

      test('code, context, index, and document', () => {
        const code = 'return "ok";';
        const context = 'filter';
        const index = 'index';
        const document = `{
  "a": {
    "b": "c",
    "d": "e"
  }
}`;
        expect(formatRequestPayload({ code, context, index, document }, format)).toMatchSnapshot();
      });

      test('code, parameters, context, index, and document', () => {
        const code = 'return "ok";';
        const parameters = `{
  "a": {
    "b": "c",
    "d": "e"
  }
}`;
        const context = 'filter';
        const index = 'index';
        const document = parameters;
        expect(
          formatRequestPayload({ code, parameters, context, index, document }, format)
        ).toMatchSnapshot();
      });
    });
  });
});
