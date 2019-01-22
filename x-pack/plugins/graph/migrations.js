/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export default {
  'graph-workspace': {
    '7.0.0': (doc) => {
      // Set new "references" attribute
      doc.references = doc.references || [];
      // Migrate index pattern
      const wsState = get(doc, 'attributes.wsState');
      if (typeof wsState !== 'string') {
        throw new Error(`wsState is ${wsState ? 'not a string' : 'missing'} on graph-workspace "${doc.id}"`);
      }
      let state;
      try {
        state = JSON.parse(JSON.parse(wsState));
      } catch (e) {
        throw new Error(`Failed to parse wsState: "${wsState}" because "${e.message}" on graph-workspace "${doc.id}"`);
      }
      const { indexPattern } = state;
      if (!indexPattern) {
        throw new Error(`"indexPattern" attribute is missing within wsState on graph-workspace "${doc.id}"`);
      }
      state.indexPatternRef = 'indexPattern_0';
      delete state.indexPattern;
      doc.attributes.wsState = JSON.stringify(JSON.stringify(state));
      doc.references.push({
        name: 'indexPattern_0',
        type: 'index-pattern',
        id: indexPattern,
      });
      return doc;
    }
  }
};
