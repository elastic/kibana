/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SecurityPageName } from '../../../common';
import { useKibana } from '../lib/kibana';

export const useUpselling = (pageName: SecurityPageName): React.ComponentType | null => {
  const { upselling } = useKibana().services;
  const upsellingPages = useObservable(upselling.pages$);

  return useMemo(() => {
    if (upsellingPages?.has(pageName)) {
      return upsellingPages.get(pageName) ?? null;
    }
    return null;
  }, [pageName, upsellingPages]);
};

export const useUpsellingSection = (id: string): React.ComponentType | null => {
  const { upselling } = useKibana().services;
  const upsellingSections = useObservable(upselling.sections$);

  return useMemo(() => {
    if (upsellingSections?.has(id)) {
      return upsellingSections.get(id) ?? null;
    }
    return null;
  }, [id, upsellingSections]);
};
