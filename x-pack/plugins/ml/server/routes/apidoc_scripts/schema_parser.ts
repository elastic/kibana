/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO(jbudz): should be removed when upgrading to TS@4.8
// this is a skip for the errors created when typechecking with isolatedModules
export {};

function parse(content?: string) {
  const schema = typeof content === 'string' && content.trim();

  if (!schema) {
    return null;
  }

  const result = schema.match(/\((\w+)\)\s+(\w+)/);

  if (result === null || result.length < 3) {
    throw new Error(
      'Invalid schema definition. Required format is `@apiSchema (<GROUP_NAME>) <SCHEMA_NAME>`'
    );
  }

  const group = result[1];

  return {
    group,
    name: result[2],
  };
}

/**
 * Exports
 */
module.exports = {
  parse,
  path: 'local.schemas',
  method: 'push',
};
