/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Namespace string eventually becomes part of an index name. This method partially implements index name rules from
// https://github.com/elastic/elasticsearch/blob/master/docs/reference/indices/create-index.asciidoc
export function isValidNamespace(namespace: string) {
  return (
    typeof namespace === 'string' &&
    // Lowercase only
    namespace === namespace.toLowerCase() &&
    // Cannot include \, /, *, ?, ", <, >, |, space character, comma, #, :
    /^[^\*\\/\?"<>|\s,#:]+$/.test(namespace)
  );
}
