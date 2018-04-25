/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// If a process exits ungracefully, we can try to help the user make sense of why
// by giving them a suggestion based on the code.
export function exitCodeSuggestion(code) {
  if (code === null) {
    return 'Your report may be too large. Try removing some visualizations or increasing the RAM available to Kibana.';
  }
  return '';
}
