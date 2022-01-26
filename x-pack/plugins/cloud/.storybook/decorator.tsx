/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DecoratorFn } from '@storybook/react';
import { ServicesProvider, CloudServices } from '../public/services';

// TODO: move to a storybook implementation of the service using parameters.
const services: CloudServices = {
  chat: {
    enabled: true,
    chatURL: 'https://elasticcloud-production-chat-us-east-1.s3.amazonaws.com/drift-iframe.html',
    userID: 'user-id',
    userEmail: 'test-user@elastic.co',
    // this doesn't affect chat appearance,
    // but a user identity in Drift only
    identityJWT: 'identity-jwt',
  },
};

export const getEngagementContextDecorator: DecoratorFn = (storyFn) => {
  const EngagementProvider = getEngagementContextProvider();
  return <EngagementProvider>{storyFn()}</EngagementProvider>;
};

export const getEngagementContextProvider: () => React.FC =
  () =>
  ({ children }) =>
    <ServicesProvider {...services}>{children}</ServicesProvider>;
