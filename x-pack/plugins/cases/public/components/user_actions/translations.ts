/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../case_view/translations';

export const ALREADY_PUSHED_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.cases.caseView.alreadyPushedToExternalService', {
    values: { externalService },
    defaultMessage: 'Already pushed to { externalService } incident',
  });

export const REQUIRED_UPDATE_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.cases.caseView.requiredUpdateToExternalService', {
    values: { externalService },
    defaultMessage: 'Requires update to { externalService } incident',
  });

export const COPY_REFERENCE_LINK = i18n.translate('xpack.cases.caseView.copyCommentLinkAria', {
  defaultMessage: 'Copy reference link',
});

export const MOVE_TO_ORIGINAL_COMMENT = i18n.translate('xpack.cases.caseView.moveToCommentAria', {
  defaultMessage: 'Highlight the referenced comment',
});

export const ALERT_COMMENT_LABEL_TITLE = i18n.translate(
  'xpack.cases.caseView.alertCommentLabelTitle',
  {
    defaultMessage: 'added an alert from',
  }
);

export const MULTIPLE_ALERTS_COMMENT_LABEL_TITLE = (totalAlerts: number) =>
  i18n.translate('xpack.cases.caseView.generatedAlertCommentLabelTitle', {
    values: { totalAlerts },
    defaultMessage: 'added {totalAlerts} alerts from',
  });

export const SHOW_ALERT_TOOLTIP = i18n.translate('xpack.cases.caseView.showAlertTooltip', {
  defaultMessage: 'Show alert details',
});

export const UNKNOWN_RULE = i18n.translate('xpack.cases.caseView.unknownRule.label', {
  defaultMessage: 'Unknown rule',
});

export const ISOLATED_HOST = i18n.translate('xpack.cases.caseView.isolatedHost', {
  defaultMessage: 'submitted isolate request on host',
});

export const RELEASED_HOST = i18n.translate('xpack.cases.caseView.releasedHost', {
  defaultMessage: 'submitted release request on host',
});

export const OTHER_ENDPOINTS = (endpoints: number): string =>
  i18n.translate('xpack.cases.caseView.otherEndpoints', {
    values: { endpoints },
    defaultMessage: ` and {endpoints} {endpoints, plural, =1 {other} other {others}}`,
  });

export const CANCEL_BUTTON = i18n.translate('xpack.cases.caseView.delete.cancel', {
  defaultMessage: 'Cancel',
});

export const CONFIRM_BUTTON = i18n.translate('xpack.cases.caseView.delete.confirm', {
  defaultMessage: 'Delete',
});
