/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';

export const ADDED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.addedField', {
  defaultMessage: 'added',
});

export const CHANGED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.changededField', {
  defaultMessage: 'changed',
});

export const ENABLED_SETTING = i18n.translate('xpack.cases.caseView.actionLabel.enabledSetting', {
  defaultMessage: 'enabled',
});

export const DISABLED_SETTING = i18n.translate('xpack.cases.caseView.actionLabel.disableSetting', {
  defaultMessage: 'disabled',
});

export const SELECTED_THIRD_PARTY = (thirdParty: string) =>
  i18n.translate('xpack.cases.caseView.actionLabel.selectedThirdParty', {
    values: {
      thirdParty,
    },
    defaultMessage: 'selected { thirdParty } as incident management system',
  });

export const REMOVED_THIRD_PARTY = i18n.translate(
  'xpack.cases.caseView.actionLabel.removedThirdParty',
  {
    defaultMessage: 'removed external incident management system',
  }
);

export const EDITED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.editedField', {
  defaultMessage: 'edited',
});

export const REMOVED_FIELD = i18n.translate('xpack.cases.caseView.actionLabel.removedField', {
  defaultMessage: 'removed',
});

export const VIEW_INCIDENT = (incidentNumber: string) =>
  i18n.translate('xpack.cases.caseView.actionLabel.viewIncident', {
    defaultMessage: 'View {incidentNumber}',
    values: {
      incidentNumber,
    },
  });

export const PUSHED_NEW_INCIDENT = i18n.translate(
  'xpack.cases.caseView.actionLabel.pushedNewIncident',
  {
    defaultMessage: 'pushed as new incident',
  }
);

export const UPDATE_INCIDENT = i18n.translate('xpack.cases.caseView.actionLabel.updateIncident', {
  defaultMessage: 'updated incident',
});

export const ADDED_DESCRIPTION = i18n.translate('xpack.cases.caseView.actionLabel.addDescription', {
  defaultMessage: 'added description',
});

export const EDIT_DESCRIPTION = i18n.translate('xpack.cases.caseView.edit.description', {
  defaultMessage: 'Edit description',
});

export const QUOTE = i18n.translate('xpack.cases.caseView.edit.quote', {
  defaultMessage: 'Quote',
});

export const EDIT_COMMENT = i18n.translate('xpack.cases.caseView.edit.comment', {
  defaultMessage: 'Edit comment',
});

export const DELETE_COMMENT = i18n.translate('xpack.cases.caseView.delete.comment', {
  defaultMessage: 'Delete comment',
});

export const DELETE_COMMENT_TITLE = i18n.translate('xpack.cases.caseView.delete.comment', {
  defaultMessage: 'Delete this comment?',
});

export const ON = i18n.translate('xpack.cases.caseView.actionLabel.on', {
  defaultMessage: 'on',
});

export const STATUS = i18n.translate('xpack.cases.caseView.statusLabel', {
  defaultMessage: 'Status',
});

export const CASE = i18n.translate('xpack.cases.caseView.case', {
  defaultMessage: 'case',
});

export const COMMENT = i18n.translate('xpack.cases.caseView.comment', {
  defaultMessage: 'comment',
});

export const CASE_REFRESH = i18n.translate('xpack.cases.caseView.caseRefresh', {
  defaultMessage: 'Refresh case',
});

export const ACTIVITY = i18n.translate('xpack.cases.caseView.activity', {
  defaultMessage: 'Activity',
});

export const EMAIL_SUBJECT = (caseTitle: string) =>
  i18n.translate('xpack.cases.caseView.emailSubject', {
    values: { caseTitle },
    defaultMessage: 'Security Case - {caseTitle}',
  });

export const EMAIL_BODY = (caseUrl: string) =>
  i18n.translate('xpack.cases.caseView.emailBody', {
    values: { caseUrl },
    defaultMessage: 'Case reference: {caseUrl}',
  });

export const CHANGED_CONNECTOR_FIELD = i18n.translate('xpack.cases.caseView.fieldChanged', {
  defaultMessage: `changed connector field`,
});

export const SYNC_ALERTS = i18n.translate('xpack.cases.caseView.syncAlertsLabel', {
  defaultMessage: `Sync alerts`,
});

export const SYNC_ALERTS_LC = i18n.translate('xpack.cases.caseView.syncAlertsLowercaseLabel', {
  defaultMessage: `sync alerts`,
});

export const DOES_NOT_EXIST_TITLE = i18n.translate('xpack.cases.caseView.doesNotExist.title', {
  defaultMessage: 'This case does not exist',
});

export const DOES_NOT_EXIST_DESCRIPTION = (caseId: string) =>
  i18n.translate('xpack.cases.caseView.doesNotExist.description', {
    values: {
      caseId,
    },
    defaultMessage:
      'A case with id {caseId} could not be found. This likely means the case has been deleted, or the id is incorrect.',
  });

export const DOES_NOT_EXIST_BUTTON = i18n.translate('xpack.cases.caseView.doesNotExist.button', {
  defaultMessage: 'Back to Cases',
});
