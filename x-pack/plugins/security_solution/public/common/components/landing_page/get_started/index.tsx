/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SecurityProductTypes } from './configs';
import { GetStarted } from './lazy';

export const getSecurityGetStartedComponent = (
  productTypes: SecurityProductTypes
): React.ComponentType<{ indicesExist?: boolean }> =>
  function GetStartedComponent({ indicesExist }: { indicesExist?: boolean }) {
    return <GetStarted productTypes={productTypes} indicesExist={indicesExist} />;
  };
