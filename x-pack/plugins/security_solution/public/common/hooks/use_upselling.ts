/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpsellingMessageId,
  UpsellingSectionId,
} from '@kbn/security-solution-upselling/service';
import { useMemo } from 'react';
import type React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { SecurityPageName } from '../../../common';
import { useUpsellingService } from '../components/upselling_provider';

export const useUpsellingComponent = (id: UpsellingSectionId): React.ComponentType | null => {
  const upselling = useUpsellingService();
  const upsellingSections = useObservable(upselling.sections$, upselling.getSectionsValue());

  return useMemo(() => upsellingSections?.get(id) ?? null, [id, upsellingSections]);
};

export const useUpsellingMessage = (id: UpsellingMessageId): string | null => {
  const upselling = useUpsellingService();
  const upsellingMessages = useObservable(upselling.messages$, upselling.getMessagesValue());

  return useMemo(() => upsellingMessages?.get(id) ?? null, [id, upsellingMessages]);
};

export const useUpsellingPage = (pageName: SecurityPageName): React.ComponentType | null => {
  const upselling = useUpsellingService();
  const UpsellingPage = useMemo(() => upselling.getPageUpselling(pageName), [pageName, upselling]);

  return UpsellingPage ?? null;
};
