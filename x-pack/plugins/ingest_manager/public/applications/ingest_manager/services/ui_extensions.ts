/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UIExtensionRegistrationCallback,
  UIExtensionsStorage,
} from '../../../../common/types/ui_extensions';

/** Factory that returns a callback that can be used to register UI extensions */
export const createExtensionRegistrationCallback = (
  storage: UIExtensionsStorage
): UIExtensionRegistrationCallback => {
  return (extensionPoint) => {
    if (!storage[extensionPoint.integration]) {
      storage[extensionPoint.integration] = {};
    }
    if (storage[extensionPoint.integration][extensionPoint.type]?.[extensionPoint.view]) {
      throw new Error(
        `Extension point has already been registered: [${extensionPoint.integration}][${extensionPoint.type}][${extensionPoint.view}]`
      );
    }
    if (!storage[extensionPoint.integration][extensionPoint.type]) {
      storage[extensionPoint.integration][extensionPoint.type] = {};
    }

    storage[extensionPoint.integration][extensionPoint.type]![extensionPoint.view] = extensionPoint;
  };
};
