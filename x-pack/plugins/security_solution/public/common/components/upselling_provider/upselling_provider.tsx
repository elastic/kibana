/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext } from 'react';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';

export const UpsellingProviderContext = React.createContext<UpsellingService | null>(null);

export type UpsellingProviderProps = React.PropsWithChildren<{
  upsellingService: UpsellingService;
}>;

export const UpsellingProvider = memo<UpsellingProviderProps>(({ upsellingService, children }) => {
  return (
    <UpsellingProviderContext.Provider value={upsellingService}>
      {children}
    </UpsellingProviderContext.Provider>
  );
});
UpsellingProvider.displayName = 'UpsellingProvider';

export const useUpsellingService = (): UpsellingService => {
  const upsellingService = useContext(UpsellingProviderContext);

  if (!upsellingService) {
    throw new Error('UpsellingProviderContext not found');
  }

  return upsellingService;
};
