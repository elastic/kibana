/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ServicesProvider, type Services } from '../common/services';
import { GetStarted } from './lazy';
import type { SecurityProductTypes } from '../../common/config';

export const getSecurityGetStartedComponent = (
  services: Services,
  productTypes: SecurityProductTypes
): React.ComponentType =>
  function GetStartedComponent() {
    return (
      <ServicesProvider services={services}>
        <GetStarted productTypes={productTypes} />
      </ServicesProvider>
    );
  };
