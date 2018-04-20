/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';

export const outlinkEncoders = [{
  id: 'esq-rison-loose',
  title: 'elasticsearch OR query (rison encoded)',
  description: 'rison-encoded JSON, minimum_should_match=1, compatible with most Kibana URLs',
  encode: function (workspace) {
    return encodeURIComponent(rison.encode(workspace.getQuery(workspace.getSelectedOrAllNodes(), true)));
  }
}, {
  id: 'esq-rison',
  title: 'elasticsearch AND query (rison encoded)',
  description: 'rison-encoded JSON, minimum_should_match=2, compatible with most Kibana URLs',
  encode: function (workspace) {
    return encodeURIComponent(rison.encode(workspace.getQuery(workspace.getSelectedOrAllNodes())));
  }
}, {
  id: 'esq-similar-rison',
  title: 'elasticsearch more like this query (rison encoded)',
  description: 'rison-encoded JSON, "like this but not this" type query to find missing docs',
  encode: function (workspace) {
    return encodeURIComponent(rison.encode(workspace.getLikeThisButNotThisQuery(workspace.getSelectedOrAllNodes())));
  }
}, {
  id: 'esq-plain',
  title: 'elasticsearch query (plain encoding)',
  description: 'JSON encoded using standard url encoding',
  encode: function (workspace) {
    return encodeURIComponent(JSON.stringify(workspace.getQuery(workspace.getSelectedOrAllNodes())));
  }
}, {
  id: 'text-plain',
  title: 'plain text',
  description: 'Text of selected vertex labels as a plain url-encoded string',
  encode: function (workspace) {
    let q = '';
    const nodes = workspace.getSelectedOrAllNodes();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (i > 0) {
        q += ' ';
      }
      q += node.label;
    }
    return encodeURIComponent(q);
  }
}, {
  id: 'text-lucene',
  title: 'Lucene-escaped text',
  description: 'Text of selected vertex labels with any Lucene special characters encoded',
  encode: function (workspace) {
    let q = '';
    const nodes = workspace.getSelectedOrAllNodes();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (i > 0) {
        q += ' ';
      }
      q += node.label;
    }
    //escape the Lucene special characters https://lucene.apache.org/core/2_9_4/queryparsersyntax.html#Escaping Special Characters
    const luceneChars = '+-&|!(){}[]^"~*?:\\';
    q = q
      .split('')
      .map(char => luceneChars.includes(char) ? `\\${char}` : char)
      .join('');
    return encodeURIComponent(q);
  }
}];
