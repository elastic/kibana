/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const CONSOLE_EXIT_MODAL_INFO = Object.freeze({
  cancelButtonText: i18n.translate(
    'xpack.securitySolution.consolePageOverlay.exitModal.cancelButtonText',
    {
      defaultMessage: 'Cancel',
    }
  ),
  confirmButtonText: i18n.translate(
    'xpack.securitySolution.consolePageOverlay.exitModal.confirmButtonText',
    {
      defaultMessage: 'Okay, exit responder',
    }
  ),
  title: i18n.translate('xpack.securitySolution.consolePageOverlay.exitModal.title', {
    defaultMessage: 'Action is in progress',
  }),
  actionLogLink: i18n.translate('xpack.securitySolution.consolePageOverlay.exitModal.link', {
    defaultMessage: 'Action log',
  }),
});
