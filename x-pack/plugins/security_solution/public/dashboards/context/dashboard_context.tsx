/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { Tag } from '@kbn/saved-objects-tagging-plugin/common';
import { getSecurityTagIds } from '../../common/containers/dashboards/utils';
import { useKibana } from '../../common/lib/kibana';

export interface DashboardContextType {
  securityTags: Tag[] | null;
}

const DashboardContext = React.createContext<DashboardContextType | null>({ securityTags: null });

export const DashboardContextProvider: React.FC = ({ children }) => {
  const { http } = useKibana().services;
  const [securityTags, setSecurityTags] = useState<Tag[] | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (http) {
        const tags = await getSecurityTagIds(http);
        if (!ignore) {
          setSecurityTags(tags);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [http]);

  return <DashboardContext.Provider value={{ securityTags }}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardContextProvider');
  }
  return context;
};

export const useSecurityTags = () => {
  const context = useDashboardContext();
  return context.securityTags;
};
