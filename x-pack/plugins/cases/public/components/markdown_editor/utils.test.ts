/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMarkdownEditorStorageKey } from './utils';

describe('getMarkdownEditorStorageKey', () => {
  it('should return correct session key', () => {
    const caseId = 'case-id';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey(caseId, commentId);
    expect(sessionKey).toEqual(`cases.caseView.${caseId}.${commentId}.markdownEditor`);
  });

  it('should return default key when comment id is empty ', () => {
    const caseId = 'case-id';
    const commentId = '';
    const sessionKey = getMarkdownEditorStorageKey(caseId, commentId);
    expect(sessionKey).toEqual(`cases.markdown`);
  });

  it('should return default key when case id is empty ', () => {
    const caseId = '';
    const commentId = 'comment-id';
    const sessionKey = getMarkdownEditorStorageKey(caseId, commentId);
    expect(sessionKey).toEqual(`cases.markdown`);
  });
});
