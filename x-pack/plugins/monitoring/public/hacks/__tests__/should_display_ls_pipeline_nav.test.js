/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shouldDisplayLsPipelineNav } from '../should_display_ls_pipeline_nav';

describe('shouldDisplayLsPipelineNav', () => {
  it('returns true for newer versions', () => {
    expect(shouldDisplayLsPipelineNav('6.5.1')).toBe(true);
  });
  it('returns false for older versions', () => {
    expect(shouldDisplayLsPipelineNav('6.3.1')).toBe(false);
  });
  it('returns true for version 6.4.0', () => {
    expect(shouldDisplayLsPipelineNav('6.4.0')).toBe(true);
  });
  it('returns false for 5.x versions', () => {
    expect(shouldDisplayLsPipelineNav('5.6.0')).toBe(false);
  });
  it('returns false for undefined version', () => {
    expect(shouldDisplayLsPipelineNav(undefined)).toBe(false);
  });
  it('returns false for null version', () => {
    expect(shouldDisplayLsPipelineNav(null)).toBe(false);
  });
});
