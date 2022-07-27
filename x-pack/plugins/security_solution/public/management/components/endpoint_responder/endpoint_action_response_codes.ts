/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * A map of possible code's that can be returned from the endpoint for response actions
 */
export const endpointActionResponseCodes = Object.freeze({
  // -----------------------------------------------------------------
  // SUSPEND-PROCESS CODES
  // -----------------------------------------------------------------
  'ra_suspend-process_error_not-found': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.suspendProcess.notFoundError',
    { defaultMessage: 'The provided process was not found' }
  ),

  'ra_suspend-process_error_not-permitted': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.suspendProcess.notPermittedSuccess',
    { defaultMessage: 'The provided process cannot be suspended' }
  ),

  // -----------------------------------------------------------------
  // KILL-PROCESS CODES
  // -----------------------------------------------------------------
  'ra_kill-process_error_not-found': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.notFoundError',
    { defaultMessage: 'The provided process was not found' }
  ),

  'ra_kill-process_success_no-action': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.noActionSuccess',
    { defaultMessage: 'The provided process was not found or already killed' }
  ),

  'ra_kill-process_error_not-permitted': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.notPermittedSuccess',
    { defaultMessage: 'The provided process cannot be killed' }
  ),
});
