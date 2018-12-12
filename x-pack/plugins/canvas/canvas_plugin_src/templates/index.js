/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const themeDark = require('./theme_dark.json');
const themeLight = require('./theme_light.json');

// Registry expects a function that returns a spec object
export const templateSpecs = [themeDark, themeLight].map(template => () => template);
