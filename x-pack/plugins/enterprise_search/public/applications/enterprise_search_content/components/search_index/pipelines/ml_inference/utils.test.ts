/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidPipelineName } from './utils';

describe('ml inference utils', () => {
  describe('isValidPipelineName', () => {
    it('allows alphanumeric characters, underscores, & hypens', () => {
      expect(isValidPipelineName('apipelinename123')).toEqual(true);
      expect(isValidPipelineName('a_pipeline_name123')).toEqual(true);
      expect(isValidPipelineName('a-pipeline-name-123')).toEqual(true);
    });
    it('does not allow spaces', () => {
      expect(isValidPipelineName('a pipeline name')).toEqual(false);
    });
    it('does not allow special characters', () => {
      expect(isValidPipelineName('a_pipeline_name_1$')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1%')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1^')).toEqual(false);
      expect(isValidPipelineName('a_pipeline_name_1"')).toEqual(false);
    });
  });
});
