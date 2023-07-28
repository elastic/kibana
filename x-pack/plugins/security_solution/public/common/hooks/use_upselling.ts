/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { UpsellingSectionId } from '../lib/upsellings';
import { useKibana } from '../lib/kibana';
import type { SecurityPageName } from '../../../common';

export const useUpsellingComponent = (
  id: UpsellingSectionId
): React.ComponentType | null | string => {
  const { upselling } = useKibana().services;
  const upsellingSections = useObservable(upselling.sections$);

  return useMemo(() => upsellingSections?.get(id) ?? null, [id, upsellingSections]);
};

export const useUpsellingPage = (pageName: SecurityPageName): React.ComponentType | null => {
  const { upselling } = useKibana().services;
  const UpsellingPage = useMemo(() => upselling.getPageUpselling(pageName), [pageName, upselling]);

  return UpsellingPage ?? null;
};
