/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// EUI helper
// extracts search text and array of selected tags from EuiSearchBar
export const extractSearch = (queryText) => {
  const filterTags = [];
  const searchTerms = [];
  const parts = queryText.split(' ');

  parts.forEach((part) => {
    if (part.indexOf(':') >= 0) {
      const [key, value] = part.split(':');
      if (key === 'tag') {
        filterTags.push(value);
        return;
      }
    }

    searchTerms.push(part);
  });

  return { searchTerm: searchTerms.join(' '), filterTags };
};
