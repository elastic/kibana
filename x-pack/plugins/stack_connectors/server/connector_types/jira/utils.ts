/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// These characters need to be escaped per Jira's search syntax, see for more details: https://confluence.atlassian.com/jirasoftwareserver/search-syntax-for-text-fields-939938747.html
export const JQL_SPECIAL_CHARACTERS_REGEX = /[-!^+&*()[\]/{}|:?~]/;

const DOUBLE_BACKSLASH_REGEX = '\\\\$&';

export const escapeJqlSpecialCharacters = (str: string) => {
  return str
    .replaceAll('"', '')
    .replaceAll(/\\/g, '\\\\')
    .replaceAll(/'/g, '\\\\')
    .replaceAll(new RegExp(JQL_SPECIAL_CHARACTERS_REGEX, 'g'), DOUBLE_BACKSLASH_REGEX);
};
