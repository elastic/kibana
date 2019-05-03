/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const darkTemplate = require('./theme_dark.json');
const lightTemplate = require('./theme_light.json');
const pitchTemplate = require('./pitch_presentation.json');
const statusTemplate = require('./status_report.json');

// Registry expects a function that returns a spec object
export const templateSpecs = [darkTemplate, lightTemplate, pitchTemplate, statusTemplate].map(
  template => () => template
);
