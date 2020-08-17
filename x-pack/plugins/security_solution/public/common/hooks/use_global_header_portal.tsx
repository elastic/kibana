/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { createPortalNode } from 'react-reverse-portal';

/**
 * A singleton portal for rendering content in the global header
 */
const globalHeaderPortalNodeSingleton = createPortalNode();

export const useGlobalHeaderPortal = () => {
  const [globalHeaderPortalNode] = useState(globalHeaderPortalNodeSingleton);

  return { globalHeaderPortalNode };
};
