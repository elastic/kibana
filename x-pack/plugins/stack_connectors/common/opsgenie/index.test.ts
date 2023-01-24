/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertProvidedActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { RULE_TAGS_TEMPLATE } from '.';

describe('index', () => {
  describe('tags', () => {
    it('uses the same string as the public directory', () => {
      expect(`{{${AlertProvidedActionVariables.ruleTags}}}`).toEqual(RULE_TAGS_TEMPLATE);
    });
  });
});
