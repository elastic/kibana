/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class SpacesDataStore {
  constructor(spaces = []) {
    this.loadSpaces(spaces);
  }

  loadSpaces(spaces = []) {
    this._spaces = [...spaces];
    this._matchedSpaces = [...spaces];
  }

  search(searchCriteria, caseSensitive = false) {
    const criteria = caseSensitive ? searchCriteria : searchCriteria.toLowerCase();

    this._matchedSpaces = this._spaces.filter(space => {
      const spaceName = caseSensitive ? space.name : space.name.toLowerCase();

      return spaceName.indexOf(criteria) >= 0;
    });

    return this._matchedSpaces;
  }

  getPage(pageIndex, pageSize) {
    const startIndex = Math.min(pageIndex * pageSize, this._matchedSpaces.length);
    const endIndex = Math.min(startIndex + pageSize, this._matchedSpaces.length);

    return this._matchedSpaces.slice(startIndex, endIndex);
  }
}
