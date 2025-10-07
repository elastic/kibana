/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SynthtraceProvider } from '../../onechat_api_integration/configs/synthrace_provider';
import { services as platformDeploymentAgnosticServices } from '../../api_integration_deployment_agnostic/services';

/**
 * Services common to both API and UI onechat test suites.
 */
export const oneChatCommonServices = {
  ...platformDeploymentAgnosticServices,
  synthtrace: SynthtraceProvider,
};

export type OneChatCommonServices = typeof oneChatCommonServices;
