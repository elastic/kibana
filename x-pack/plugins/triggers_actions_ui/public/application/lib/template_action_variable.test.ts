/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { templateActionVariable } from './template_action_variable';

describe('templateActionVariable', () => {
  const actionVariable = {
    name: 'myVar',
    description: 'My variable description',
  };

  test('variable returns with double braces by default', () => {
    expect(templateActionVariable(actionVariable)).toEqual('{{myVar}}');
  });

  test('variable returns with triple braces when specified', () => {
    expect(
      templateActionVariable({ ...actionVariable, useWithTripleBracesInTemplates: true })
    ).toEqual('{{{myVar}}}');
  });
});
