/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../../translations';

export const SHOWING_CASES = (actionDate: string, actionName: string, userName: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.actionHeadline', {
    values: {
      actionDate,
      actionName,
      userName,
    },
    defaultMessage: '{userName} {actionName} on {actionDate}',
  });

export const ADDED_FIELD = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.addedField',
  {
    defaultMessage: 'added',
  }
);

export const CHANGED_FIELD = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.changededField',
  {
    defaultMessage: 'changed',
  }
);

export const SELECTED_THIRD_PARTY = (thirdParty: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.actionLabel.selectedThirdParty', {
    values: {
      thirdParty,
    },
    defaultMessage: 'selected { thirdParty } as incident management system',
  });

export const REMOVED_THIRD_PARTY = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.removedThirdParty',
  {
    defaultMessage: 'removed external incident management system',
  }
);

export const EDITED_FIELD = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.editedField',
  {
    defaultMessage: 'edited',
  }
);

export const REMOVED_FIELD = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.removedField',
  {
    defaultMessage: 'removed',
  }
);

export const VIEW_INCIDENT = (incidentNumber: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.actionLabel.viewIncident', {
    defaultMessage: 'View {incidentNumber}',
    values: {
      incidentNumber,
    },
  });

export const PUSHED_NEW_INCIDENT = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.pushedNewIncident',
  {
    defaultMessage: 'pushed as new incident',
  }
);

export const UPDATE_INCIDENT = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.updateIncident',
  {
    defaultMessage: 'updated incident',
  }
);

export const ADDED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.addDescription',
  {
    defaultMessage: 'added description',
  }
);

export const EDIT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.case.caseView.edit.description',
  {
    defaultMessage: 'Edit description',
  }
);

export const QUOTE = i18n.translate('xpack.securitySolution.case.caseView.edit.quote', {
  defaultMessage: 'Quote',
});

export const EDIT_COMMENT = i18n.translate('xpack.securitySolution.case.caseView.edit.comment', {
  defaultMessage: 'Edit comment',
});

export const ON = i18n.translate('xpack.securitySolution.case.caseView.actionLabel.on', {
  defaultMessage: 'on',
});

export const ADDED_COMMENT = i18n.translate(
  'xpack.securitySolution.case.caseView.actionLabel.addComment',
  {
    defaultMessage: 'added comment',
  }
);

export const STATUS = i18n.translate('xpack.securitySolution.case.caseView.statusLabel', {
  defaultMessage: 'Status',
});

export const CASE = i18n.translate('xpack.securitySolution.case.caseView.case', {
  defaultMessage: 'case',
});

export const COMMENT = i18n.translate('xpack.securitySolution.case.caseView.comment', {
  defaultMessage: 'comment',
});

export const CASE_OPENED = i18n.translate('xpack.securitySolution.case.caseView.caseOpened', {
  defaultMessage: 'Case opened',
});

export const CASE_CLOSED = i18n.translate('xpack.securitySolution.case.caseView.caseClosed', {
  defaultMessage: 'Case closed',
});

export const CASE_REFRESH = i18n.translate('xpack.securitySolution.case.caseView.caseRefresh', {
  defaultMessage: 'Refresh case',
});

export const EMAIL_SUBJECT = (caseTitle: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.emailSubject', {
    values: { caseTitle },
    defaultMessage: 'Security Case - {caseTitle}',
  });

export const EMAIL_BODY = (caseUrl: string) =>
  i18n.translate('xpack.securitySolution.case.caseView.emailBody', {
    values: { caseUrl },
    defaultMessage: 'Case reference: {caseUrl}',
  });
export const UNKNOWN = i18n.translate('xpack.securitySolution.case.caseView.unknown', {
  defaultMessage: 'Unknown',
});
