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

export const GENERATED_ALERT_COMMENT_LABEL_TITLE = i18n.translate(
  'xpack.cases.caseView.generatedAlertCommentLabelTitle',
  {
    defaultMessage: 'were added from',
  }
);

export const GENERATED_ALERT_COUNT_COMMENT_LABEL_TITLE = (totalCount: number) =>
  i18n.translate('xpack.cases.caseView.generatedAlertCountCommentLabelTitle', {
    values: { totalCount },
    defaultMessage: `{totalCount} {totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const SHOW_ALERT_TOOLTIP = i18n.translate('xpack.cases.caseView.showAlertTooltip', {
  defaultMessage: 'Show alert details',
});

export const UNKNOWN_RULE = i18n.translate('xpack.cases.caseView.unknownRule.label', {
  defaultMessage: 'Unknown rule',
});
