/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { TableEntityType } from '../../../../../common/types';

const ENTITY_TYPE_PLURAL = (entityType: TableEntityType, count: number) => {
  switch (entityType) {
    case TableEntityType.alert: {
      return i18n.translate('xpack.securitySolution.toolbar.bulkActions.entityAlerts', {
        values: { count },
        defaultMessage: '{count, plural, =1 {alert} other {alerts}}',
      });
    }
    case TableEntityType.event: {
      return i18n.translate('xpack.securitySolution.toolbar.bulkActions.entityEvents', {
        values: { count },
        defaultMessage: '{count, plural, =1 {event} other {events}}',
      });
    }
    case TableEntityType.session: {
      return i18n.translate('xpack.securitySolution.toolbar.bulkActions.entitySessions', {
        values: { count },
        defaultMessage: '{count, plural, =1 {session} other {sessions}}',
      });
    }
  }
};

export const SELECT_ALL_ENTITIES = (
  entityType: TableEntityType,
  totalFormatted: string,
  total: number
) =>
  i18n.translate('xpack.securitySolution.toolbar.bulkActions.selectAllEntitiesTitle', {
    values: { entityPlural: ENTITY_TYPE_PLURAL(entityType, total), totalFormatted, total },
    defaultMessage: 'Select {total, plural, =1 {} other {all}} {totalFormatted} {entityPlural}',
  });

export const SELECTED_ENTITIES = (
  entityType: TableEntityType,
  totalFormatted: string,
  total: number
) =>
  i18n.translate('xpack.securitySolution.toolbar.bulkActions.selectedEntitiesTitle', {
    values: { entityPlural: ENTITY_TYPE_PLURAL(entityType, total), totalFormatted },
    defaultMessage: 'Selected {totalFormatted} {entityPlural}',
  });

export const CLEAR_SELECTION = i18n.translate(
  'xpack.securitySolution.toolbar.bulkActions.clearSelectionTitle',
  {
    defaultMessage: 'Clear selection',
  }
);

export const UPDATE_ALERT_STATUS_FAILED = (conflicts: number) =>
  i18n.translate('xpack.securitySolution.bulkActions.updateAlertStatusFailed', {
    values: { conflicts },
    defaultMessage:
      'Failed to update { conflicts } {conflicts, plural, =1 {alert} other {alerts}}.',
  });

export const UPDATE_ALERT_STATUS_FAILED_DETAILED = (updated: number, conflicts: number) =>
  i18n.translate('xpack.securitySolution.bulkActions.updateAlertStatusFailedDetailed', {
    values: { updated, conflicts },
    defaultMessage: `{ updated } {updated, plural, =1 {alert was} other {alerts were}} updated successfully, but { conflicts } failed to update
         because { conflicts, plural, =1 {it was} other {they were}} already being modified.`,
  });

export const CLOSED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.bulkActions.closedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully closed {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const OPENED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.bulkActions.openedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully opened {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const ACKNOWLEDGED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.bulkActions.acknowledgedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully marked {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}} as acknowledged.',
  });

export const CLOSED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.bulkActions.closedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to close alert(s).',
  }
);

export const OPENED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.bulkActions.openedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to open alert(s)',
  }
);

export const ACKNOWLEDGED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.bulkActions.acknowledgedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to mark alert(s) as acknowledged',
  }
);

export const BULK_ACTION_FAILED_SINGLE_ALERT = i18n.translate(
  'xpack.securitySolution.bulkActions.updateAlertStatusFailedSingleAlert',
  {
    defaultMessage: 'Failed to update alert because it was already being modified.',
  }
);

export const BULK_ACTION_OPEN_SELECTED = i18n.translate(
  'xpack.securitySolution.bulkActions.openSelectedTitle',
  {
    defaultMessage: 'Mark as open',
  }
);

export const BULK_ACTION_ACKNOWLEDGED_SELECTED = i18n.translate(
  'xpack.securitySolution.bulkActions.acknowledgedSelectedTitle',
  {
    defaultMessage: 'Mark as acknowledged',
  }
);

export const BULK_ACTION_CLOSE_SELECTED = i18n.translate(
  'xpack.securitySolution.bulkActions.closeSelectedTitle',
  {
    defaultMessage: 'Mark as closed',
  }
);
