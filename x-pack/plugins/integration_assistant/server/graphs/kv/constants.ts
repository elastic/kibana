/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const KV_EXAMPLE_ANSWER = {
    field_split: " ",
    value_split: ":",
    trim_value: " ",
    trim_key: " ",
};

export const KV_HEADER_EXAMPLE_ANSWER = {
  rfc: 'RFC2454',
  regex:
    '/(?:(d{4}[-]d{2}[-]d{2}[T]d{2}[:]d{2}[:]d{2}(?:.d{1,6})?(?:[+-]d{2}[:]d{2}|Z)?)|-)s(?:([w][wd.@-]*)|-)s(.*)$/',
  grok_pattern: '%{WORD:key1}:%{WORD:value1};%{WORD:key2}:%{WORD:value2}',
};
