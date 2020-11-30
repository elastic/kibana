/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UIExtensionRegistrationCallback, UIExtensionsStorage } from '../types';

/** Factory that returns a callback that can be used to register UI extensions */
export const createExtensionRegistrationCallback = (
  storage: UIExtensionsStorage
): UIExtensionRegistrationCallback => {
  return (extensionPoint) => {
    const { package: packageName, view } = extensionPoint;

    if (!storage[packageName]) {
      storage[packageName] = {};
    }

    if (storage[packageName]?.[view]) {
      throw new Error(`Extension point has already been registered: [${packageName}][${view}]`);
    }

    storage[packageName][view] = extensionPoint;
  };
};
