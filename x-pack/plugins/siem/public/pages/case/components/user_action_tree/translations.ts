/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../case_view/translations';

export const ALREADY_PUSHED_TO_SERVICE = i18n.translate(
  'xpack.siem.case.caseView.alreadyPushedToService',
  {
    defaultMessage: 'Already pushed to Service Now incident',
  }
);

export const REQUIRED_UPDATE_TO_SERVICE = i18n.translate(
  'xpack.siem.case.caseView.requiredUpdateToService',
  {
    defaultMessage: 'Requires update to ServiceNow incident',
  }
);

export const COPY_REFERENCE_LINK = i18n.translate('xpack.siem.case.caseView.copyCommentLinkAria', {
  defaultMessage: 'Copy reference link',
});

export const MOVE_TO_ORIGINAL_COMMENT = i18n.translate(
  'xpack.siem.case.caseView.moveToCommentAria',
  {
    defaultMessage: 'Highlight the referenced comment',
  }
);
