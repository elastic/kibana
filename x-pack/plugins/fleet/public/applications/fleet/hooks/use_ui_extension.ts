/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { UIExtensionPoint, UIExtensionsStorage } from '../types';

export const UIExtensionsContext = React.createContext<UIExtensionsStorage>({});

type SpecificExtensionPoint<A, T, V> = A extends { type: T; view: V } ? A : never;
type NarrowViews<T = UIExtensionPoint['type'], A = UIExtensionPoint> = A extends {
  type: T;
}
  ? A
  : never;

export const useUIExtension = <
  T extends UIExtensionPoint['type'] = UIExtensionPoint['type'],
  V extends NarrowViews<T>['view'] = never
>(
  integration: UIExtensionPoint['package'],
  type: T,
  view: V
): SpecificExtensionPoint<UIExtensionPoint, T, V>['component'] | undefined => {
  const extension = useContext(UIExtensionsContext)?.[integration]?.[type]?.[view];
  if (extension) {
    // FIXME:PT Revisit ignore below and see if TS error can be addressed
    // @ts-ignore
    return extension.component;
  }
};
