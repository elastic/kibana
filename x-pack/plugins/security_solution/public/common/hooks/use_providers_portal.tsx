/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { createPortalNode } from 'react-reverse-portal';

/**
 * A singleton portal for rendering the draggable groups of providers in the
 * header of the timeline, or in the animated flyout
 */
const proivdersPortalNodeSingleton = createPortalNode();

export const useProvidersPortal = () => {
  const [proivdersPortalNode] = useState(proivdersPortalNodeSingleton);

  return proivdersPortalNode;
};
