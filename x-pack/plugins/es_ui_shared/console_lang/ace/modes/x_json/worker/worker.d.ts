/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Satisfy TS's requirements that the module be declared per './index.ts'.
declare module '!!raw-loader!./worker.js' {
  const content: string;
  // eslint-disable-next-line import/no-default-export
  export default content;
}
