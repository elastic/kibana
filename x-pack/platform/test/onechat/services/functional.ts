/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import type { pageObjects } from '../../functional/page_objects';
import { services as deploymentAgnosticFunctionalServices } from '../../serverless/functional/services/deployment_agnostic_services';
import { oneChatCommonServices } from './common';

/**
 * Onechat UI-only services.
 * Composes common services and functional/UI-specific services needed by onechat functional tests.
 */
export const oneChatFunctionalServices = {
  ...oneChatCommonServices,
  ...deploymentAgnosticFunctionalServices,
};

export type OneChatUiFtrProviderContext = GenericFtrProviderContext<
  typeof oneChatFunctionalServices,
  typeof pageObjects
>;
