/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCreateCasePath,
  getCaseViewPath,
  getCasesConfigurePath,
  getCaseViewWithCommentPath,
  generateCaseViewPath,
} from './paths';

describe('Paths', () => {
  describe('getCreateCasePath', () => {
    it('returns the correct path', () => {
      expect(getCreateCasePath('test')).toBe('test/create');
    });
  });

  describe('getCasesConfigurePath', () => {
    it('returns the correct path', () => {
      expect(getCasesConfigurePath('test')).toBe('test/configure');
    });
  });

  describe('getCaseViewPath', () => {
    it('returns the correct path', () => {
      expect(getCaseViewPath('test')).toBe('test/:detailName');
    });
  });

  describe('getCaseViewWithCommentPath', () => {
    it('returns the correct path', () => {
      expect(getCaseViewWithCommentPath('test')).toBe('test/:detailName/:commentId');
    });
  });

  describe('generateCaseViewPath', () => {
    it('returns the correct path', () => {
      expect(generateCaseViewPath({ detailName: 'my-case' })).toBe('/my-case');
    });

    it('returns the correct path when commentId is provided', () => {
      expect(generateCaseViewPath({ detailName: 'my-case', commentId: 'my-comment' })).toBe(
        '/my-case/my-comment'
      );
    });
  });
});
