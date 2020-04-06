/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';

interface StreamVars {
  [k: string]: string | string[];
}

export function createStream(vars: StreamVars, streamTemplate: string) {
  const template = Handlebars.compile(streamTemplate);
  return template(vars);
}
