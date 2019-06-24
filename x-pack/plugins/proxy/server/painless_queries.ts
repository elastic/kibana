/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const unassignResource = `
if (ctx['source'].containsKey(resource)) { 
  ctx['source'].remove(resource);
}
`;

export const updateHeartbeat = `
ctx['_source'].put(resource, ctx['_source'].getOrDefault(resource, 0) + 1);
`;

export const removeHeartbeat = `
if (ctx['_source'].containsKey(resource)) {
  ctx['_source'].remove(resource);
}
`;

export const cullDeadResources = `
for (node in ctx['_source'].entrySet()) {
  data = node.getValue();
  key = node.getKey();
  if (!nodes.contains(data.get('node'))) {
    if (data.get('state') == routeClosing) {
      ctx['_source'].remove(key);
    } else {
      data.put('state', routeClosing)
      ctx['_source'].put(key, data)
    }
  } else {
    if (data.get('state') == routeClosing) {
      data.put('state', routeStarted)
      ctx['_source'].put(key, data)
    }
  }
}
`;

export const cullDeadNodes = `
for (node in ctx['_source'].entrySet()) {
  if (node.getValue() == nodeList[key]) {
    key = node.getKey();
    ctx['_source'].remove(key)
  }
}
`;
