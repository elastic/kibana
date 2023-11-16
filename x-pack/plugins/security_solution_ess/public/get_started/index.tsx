/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';

import { withServicesProvider, type Services } from '../common/services';
import { GetStarted } from './lazy';

export const getSecurityGetStartedComponent = (services: Services): React.ComponentType =>
  withServicesProvider(GetStarted, services);
