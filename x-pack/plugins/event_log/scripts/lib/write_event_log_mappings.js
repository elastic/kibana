#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { writeGeneratedFile } = require('./write_generated_file');

const EVENT_LOG_MAPPINGS_FILE = '../generated/mappings.json';

module.exports = {
  writeEventLogMappings,
};

function writeEventLogMappings(elSchema) {
  const mappings = {
    dynamic: 'false',
    properties: elSchema.mappings.properties,
  };

  writeGeneratedFile(EVENT_LOG_MAPPINGS_FILE, JSON.stringify(mappings, null, 4));
  console.log('generated:', EVENT_LOG_MAPPINGS_FILE);
}
