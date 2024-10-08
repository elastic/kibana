/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OWNER_INFO } from '../constants';
import type { Owner } from '../constants/types';

export const isValidOwner = (owner: string): owner is keyof typeof OWNER_INFO =>
  Object.keys(OWNER_INFO).includes(owner);

export const getCaseOwnerByAppId = (currentAppId?: string) =>
  Object.values(OWNER_INFO).find((info) => info.appId === currentAppId)?.id;

export const getOwnerFromRuleConsumerProducer = (consumer?: string, producer?: string): Owner => {
  for (const value of Object.values(OWNER_INFO)) {
    const foundConsumer = value.validRuleConsumers?.find(
      (validConsumer) => validConsumer === consumer || validConsumer === producer
    );

    if (foundConsumer) {
      return value.id;
    }
  }

  return OWNER_INFO.cases.id;
};
