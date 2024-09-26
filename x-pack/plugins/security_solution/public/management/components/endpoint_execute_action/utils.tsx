/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getEmptyValue } from '../../../common/components/empty_value';

export const emptyValue = getEmptyValue();

export const ACCORDION_BUTTON_TEXT = Object.freeze({
  context: i18n.translate(
    'xpack.securitySolution.responseActionExecuteAccordion.executionContext',
    {
      defaultMessage: 'Execution context',
    }
  ),
  output: {
    regular: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.outputButtonTextRegular',
      {
        defaultMessage: 'Execution output',
      }
    ),
    truncated: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.outputButtonTextTruncated',
      {
        defaultMessage: 'Execution output (truncated)',
      }
    ),
  },
  error: {
    regular: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.errorButtonTextRegular',
      {
        defaultMessage: 'Execution error',
      }
    ),
    truncated: i18n.translate(
      'xpack.securitySolution.responseActionExecuteAccordion.errorButtonTextTruncated',
      {
        defaultMessage: 'Execution error (truncated)',
      }
    ),
  },
});

export const SHELL_INFO = Object.freeze({
  shell: i18n.translate('xpack.securitySolution.responseActionExecuteAccordion.shellInformation', {
    defaultMessage: 'Shell',
  }),

  returnCode: i18n.translate(
    'xpack.securitySolution.responseActionExecuteAccordion.shellReturnCode',
    {
      defaultMessage: 'Return code',
    }
  ),
  currentDir: i18n.translate(
    'xpack.securitySolution.responseActionExecuteAccordion.currentWorkingDirectory',
    {
      defaultMessage: 'Executed from',
    }
  ),
});

export const EXECUTE_OUTPUT_FILE_TRUNCATED_MESSAGE = i18n.translate(
  'xpack.securitySolution.responseActionFileDownloadLink.fileTruncated',
  {
    defaultMessage:
      'Output data in the provided zip file is truncated due to file size limitations.',
  }
);
