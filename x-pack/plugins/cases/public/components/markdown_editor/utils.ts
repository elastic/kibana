/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getMarkdownEditorStorageKey = (caseId: string, commentId: string): string => {
  if (caseId === '' || commentId === '') {
    return 'cases.markdown';
  }

  return `cases.caseView.${caseId}.${commentId}.markdownEditor`;
};
