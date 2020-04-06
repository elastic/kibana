/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function parse(content?: string) {
  const schema = typeof content === 'string' && content.trim();

  if (!schema) {
    return null;
  }

  return {
    schema,
  };
}

/**
 * Exports
 */
module.exports = {
  parse,
  path: 'local',
  method: 'insert',
};
