/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const RELATED_ECS_FIELDS = [
  {
    field: 'related.hash',
    type: 'keyword',
    description: 'All the hashes seen in the docs',
    note: 'this field should contain an array of values',
  },
  {
    field: 'related.hosts',
    type: 'keyword',
    description: 'All hostnames or other host identifiers seen in the docs',
    note: 'this field should contain an array of values',
  },
  {
    field: 'related.ip',
    type: 'keyword',
    description: 'All of the IPs seen in the docs',
    note: 'this field should contain an array of values',
  },
  {
    field: 'related.user',
    type: 'keyword',
    description: 'All the user names or other user identifiers seen in the docs',
    note: 'this field should contain an array of values',
  },
];

export const RELATED_EXAMPLE_ANSWER = [
  {
    field: 'related.ip',
    value_field: 'source.ip',
  },
  {
    field: 'related.user',
    value_field: 'server.user.name',
  },
  {
    field: 'related.hosts',
    value_field: 'client.domain',
  },
  {
    field: 'related.hash',
    value_field: 'file.hash.sha1',
  },
  {
    field: 'related.hash',
    value_field: 'file.hash.sha256',
  },
];

export const COMMON_ERRORS = [
  {
    error: 'dynamic getter [java.lang.String, ] not found',
    reason:
      'The error is caused when an if condition is trying to access a stringified object, and the field is not available in the current context.',
    action: 'Remove the relevant processor object from the list of processors in your response.',
  },
  {
    error: 'illegal_argument_exception: unexpected character',
    reason: 'The error is caused when one or more if conditions uses an illegal character.',
    action:
      "Check which illegal character is used and remove it. Complex field names can be written inside square brackets for example like ctx['field.name'] != null, If this is not possible then remove the whole processor from your response",
  },
  {
    error: 'Illegal list shortcut value [value]',
    reason: 'The field or value_field is trying to access a path which is currently an array.',
    action:
      'The field or value cannot be accessed because it is an array, remove the current processor from your response. If this was your only processor in the response then return an empty JSON object {}',
  },
];
