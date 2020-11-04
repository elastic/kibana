/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ComponentType, LazyExoticComponent, useContext } from 'react';
import { UIExtensionPoint, UIExtensionsStorage } from '../../../../common/types/ui_extensions';

export const UIExtensionsContext = React.createContext<UIExtensionsStorage>({});

export const useUIExtension = (
  integration: UIExtensionPoint['integration'],
  type: UIExtensionPoint['type'],
  view: UIExtensionPoint['view']
): LazyExoticComponent<ComponentType<any>> | undefined => {
  const extensions = useContext(UIExtensionsContext);
  return extensions?.[integration]?.[type]?.[view];
};
