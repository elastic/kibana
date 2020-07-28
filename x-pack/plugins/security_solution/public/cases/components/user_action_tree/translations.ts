/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../case_view/translations';

export const ALREADY_PUSHED_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.alreadyPushedToExternalService', {
    values: { externalService },
    defaultMessage: 'Already pushed to { externalService } incident',
  });

export const REQUIRED_UPDATE_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.requiredUpdateToExternalService', {
    values: { externalService },
    defaultMessage: 'Requires update to { externalService } incident',
  });

export const COPY_REFERENCE_LINK = i18n.translate(
  'xpack.securitySolution.case.caseView.copyCommentLinkAria',
  {
    defaultMessage: 'Copy reference link',
  }
);

export const MOVE_TO_ORIGINAL_COMMENT = i18n.translate(
  'xpack.securitySolution.case.caseView.moveToCommentAria',
  {
    defaultMessage: 'Highlight the referenced comment',
  }
);
