/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { UIExtensionPoint, UIExtensionsStorage } from '../types';

export const UIExtensionsContext = React.createContext<UIExtensionsStorage>({});

type NarrowExtensionPoint<V extends UIExtensionPoint['view'], A = UIExtensionPoint> = A extends {
  view: V;
}
  ? A
  : never;

export const useUIExtension = <V extends UIExtensionPoint['view'] = UIExtensionPoint['view']>(
  packageName: UIExtensionPoint['package'],
  view: V
): NarrowExtensionPoint<V>['component'] | undefined => {
  const registeredExtensions = useContext(UIExtensionsContext);

  if (!registeredExtensions) {
    throw new Error('useUIExtension called outside of UIExtensionsContext');
  }

  const extension = registeredExtensions?.[packageName]?.[view];

  if (extension) {
    // FIXME:PT Revisit ignore below and see if TS error can be addressed
    // @ts-ignore
    return extension.component;
  }
};
