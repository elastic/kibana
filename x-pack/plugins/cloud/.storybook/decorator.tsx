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
    userID: '53877975',
    userEmail: 'test-user@elastic.co',
    identityJWT:
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1Mzg3Nzk3NSIsImV4cCI6MTY0MjUxNDc0Mn0.CcAZbD8R865UmoHGi27wKn0aH1bzkZXhX449yyDH2Vk',
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
