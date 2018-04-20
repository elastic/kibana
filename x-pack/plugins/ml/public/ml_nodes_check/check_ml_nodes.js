/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



let mlNodeCount = 0;
let userHasPermissionToViewMlNodeCount = false;

export function checkMlNodesAvailable(ml, kbnUrl) {
  getMlNodeCount(ml).then((nodes) => {
    if (nodes.count !== undefined && nodes.count > 0) {
      Promise.resolve();
    } else {
      kbnUrl.redirect('/jobs');
      Promise.reject();
    }
  });
}

export function getMlNodeCount(ml) {
  return new Promise((resolve) => {
    ml.mlNodeCount()
      .then((nodes) => {
        mlNodeCount = nodes.count;
        userHasPermissionToViewMlNodeCount = true;
        resolve(nodes);
      })
      .catch((error) => {
        mlNodeCount = 0;
        if (error.statusCode === 403) {
          userHasPermissionToViewMlNodeCount = false;
        } else {
          console.error(error);
        }
        resolve({ count: 0 });
      });
  });
}

export function mlNodesAvailable() {
  return (mlNodeCount !== 0);
}

export function permissionToViewMlNodeCount() {
  return userHasPermissionToViewMlNodeCount;
}
