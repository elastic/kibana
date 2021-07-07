/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

export const OwnerContext = React.createContext<string[]>([]);

export const OwnerProvider: React.FC<{
  owner: string[];
}> = ({ children, owner }) => {
  const [currentOwner] = useState(owner);

  return <OwnerContext.Provider value={currentOwner}>{children}</OwnerContext.Provider>;
};
