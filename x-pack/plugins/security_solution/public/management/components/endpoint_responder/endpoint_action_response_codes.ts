/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const CODES = Object.freeze({
  // -----------------------------------------------------------------
  // SUSPEND-PROCESS CODES
  // -----------------------------------------------------------------
  /**
   * Code will be used whenever you provide an entity_id or pid that isn't found.
   * suspend_process will always be an error because the process was not found to be suspended
   */
  'ra_suspend-process_error_not-found': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.suspendProcess.notFoundError',
    { defaultMessage: 'The provided process was not found' }
  ),

  /**
   * Code will be used when the provided process can not be killed (for stability reasons).
   * Example: This occurs if you try to kill Endpoint Security
   */
  'ra_suspend-process_error_not-permitted': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.suspendProcess.notPermittedSuccess',
    { defaultMessage: 'The provided process cannot be suspended' }
  ),

  // -----------------------------------------------------------------
  // KILL-PROCESS CODES
  // -----------------------------------------------------------------
  /**
   * Code will be used whenever you provide an entity_id that isn't found. Since entity_id is
   * unique, we can guarantee that it was legitimately not found and not just that the process
   * was already killed.
   */
  'ra_kill-process_error_not-found': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.notFoundError',
    { defaultMessage: 'The provided process was not found' }
  ),

  /**
   * Code will be used whenever you provide a pid that isn't found. Since pid is reused, we aren't
   * sure if the process was already killed or just wasn't found. In either case, a process with
   * that pid will no longer be running.
   */
  'ra_kill-process_success_no-action': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.noActionSuccess',
    { defaultMessage: 'Action completed. The provided process was not found or already killed' }
  ),

  /**
   * Code will be used when the provided process can not be killed (for stability reasons).
   * Example: This occurs if you try to kill Endpoint Security
   */
  'ra_kill-process_error_not-permitted': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.killProcess.notPermittedSuccess',
    { defaultMessage: 'The provided process cannot be killed' }
  ),
});

/**
 * A map of possible code's that can be returned from the endpoint for response actions
 */
export const endpointActionResponseCodes: Readonly<Record<string | keyof typeof CODES, string>> =
  CODES;
