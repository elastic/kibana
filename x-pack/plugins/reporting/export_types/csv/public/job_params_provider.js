/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function JobParamsProvider() {
  return async function (controller) {
    const title = controller.getSharingTitle();
    const type = controller.getSharingType();
    const sharingData = await controller.getSharingData();

    return {
      title,
      type,
      ...sharingData
    };
  };
}
