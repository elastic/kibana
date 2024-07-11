/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationCardItem } from '@kbn/fleet-plugin/public';

export const QUICKSTART_FLOWS = ['system-logs-virtual', 'kubernetes-quick-start'];

export const toCustomCard = (card: IntegrationCardItem) => ({
  ...card,
  isQuickstart: QUICKSTART_FLOWS.includes(card.name),
});

export const isQuickstart = (cardName: string) => QUICKSTART_FLOWS.includes(cardName);
