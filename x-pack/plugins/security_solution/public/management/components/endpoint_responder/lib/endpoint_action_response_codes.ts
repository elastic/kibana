/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const CODES = Object.freeze({
  // -----------------------------------------------------------------
  // GET-FILE CODES
  // -----------------------------------------------------------------
  /** file not found */
  'ra_get-file_error_not-found': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.notFound',
    { defaultMessage: 'The file specified was not found' }
  ),

  /** path is reachable but does not point to a file */
  'ra_get-file_error_is-directory': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.isDirectory',
    { defaultMessage: 'The path defined is not a file' }
  ),

  /** path did not pass basic validation: malformed path, unix instead of windows, invalid characters, not full path, etc */
  'ra_get-file_error_invalid-input': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.invalidPath',
    { defaultMessage: 'The path defined is not valid' }
  ),

  /** Maybe: possible to be able to list the file but not read it's content */
  'ra_get-file_error_not-permitted': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.notPermitted',
    { defaultMessage: 'Endpoint unable to read file requested (not permitted)' }
  ),

  /** file size exceeds hard coded limit (100MB) */
  'ra_get-file_error_too-big': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.tooBig',
    { defaultMessage: 'The file requested is too large and can not be retrieved' }
  ),

  /** Endpoint ran out of file upload queue size */
  'ra_get-file_error_disk-quota': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.diskQuota',
    { defaultMessage: 'Endpoint ran out of disk quota while attempting to retrieve file' }
  ),

  /** Something interrupted preparing the zip: file read error, zip error */
  'ra_get-file_error_processing': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.errorProcessing',
    { defaultMessage: 'File retrieval was interrupted' }
  ),

  /** The fleet upload API was unreachable (not just busy) */
  'ra_get-file_error_upload-api-unreachable': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.uploadApiUnreachable',
    { defaultMessage: 'File upload api (fleet-server) is unreachable' }
  ),

  /** Perhaps internet connection was too slow or unstable to upload all chunks before unique upload-id expired. Endpoint will re-try a bit (3 times?). */
  'ra_get-file_error_upload-timeout': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.uploadTimeout',
    { defaultMessage: 'File upload timed out' }
  ),

  /** Upload API could be busy, endpoint should periodically re-try */
  'ra_get-file_error_queue-timeout': i18n.translate(
    'xpack.securitySolution.endpointActionResponseCodes.getFile.queueTimeout',
    { defaultMessage: 'Endpoint timed out while attempting to connect to upload API' }
  ),

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
