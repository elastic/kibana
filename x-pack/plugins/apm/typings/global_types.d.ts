/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// allow JSON files to be imported directly without lint errors
// see: https://github.com/palantir/tslint/issues/1264#issuecomment-228433367
// and: https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#arbitrary-expressions-are-forbidden-in-export-assignments-in-ambient-contexts
declare module '*.json' {
  const json: any;
  // eslint-disable-next-line import/no-default-export
  export default json;
}
