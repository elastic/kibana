/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
export * from '../../translations';

export const DELETE_TITLE = (caseTitle: string) =>
  i18n.translate('xpack.securitySolution.case.confirmDeleteCase.deleteTitle', {
    values: { caseTitle },
    defaultMessage: 'Delete "{caseTitle}"',
  });

export const CONFIRM_QUESTION = i18n.translate(
  'xpack.securitySolution.case.confirmDeleteCase.confirmQuestion',
  {
    defaultMessage:
      'By deleting this case, all related case data will be permanently removed and you will no longer be able to push data to an external incident management system. Are you sure you wish to proceed?',
  }
);
export const DELETE_SELECTED_CASES = i18n.translate(
  'xpack.securitySolution.case.confirmDeleteCase.selectedCases',
  {
    defaultMessage: 'Delete selected cases',
  }
);

export const CONFIRM_QUESTION_PLURAL = i18n.translate(
  'xpack.securitySolution.case.confirmDeleteCase.confirmQuestionPlural',
  {
    defaultMessage:
      'By deleting these cases, all related case data will be permanently removed and you will no longer be able to push data to  an external incident management system. Are you sure you wish to proceed?',
  }
);
