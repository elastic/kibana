/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CONFIGURATION_BLOCKS = {
  TYPES: {
    OUTPUTS: 'outputs',
    PROCESSORS: 'processors',
    FILEBEAT_INPUTS: 'filebeat.inputs',
    FILEBEAT_MODULES: 'filebeat.modules',
    METRICBEAT_INPUTS: 'metricbeat.inputs',
    METRICBEAT_MODULES: 'metricbeat.modules'
  }
};

CONFIGURATION_BLOCKS.UNIQUENESS_ENFORCING_TYPES = [
  CONFIGURATION_BLOCKS.TYPES.OUTPUTS
];
