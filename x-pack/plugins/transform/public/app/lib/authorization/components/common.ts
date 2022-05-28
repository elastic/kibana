/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { Privileges } from '../../../../../common/types/privileges';
import { isPopulatedObject } from '../../../../../common/shared_imports';

export interface Capabilities {
  canGetTransform: boolean;
  canDeleteTransform: boolean;
  canPreviewTransform: boolean;
  canCreateTransform: boolean;
  canStartStopTransform: boolean;
  canCreateTransformAlerts: boolean;
  canUseTransformAlerts: boolean;
  canResetTransform: boolean;
}

export type Privilege = [string, string];

function isPrivileges(arg: unknown): arg is Privileges {
  return (
    isPopulatedObject(arg, ['hasAllPrivileges', 'missingPrivileges']) &&
    typeof arg.hasAllPrivileges === 'boolean' &&
    typeof arg.missingPrivileges === 'object' &&
    arg.missingPrivileges !== null
  );
}

export const toArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? value : [value];

export const hasPrivilegeFactory =
  (privileges: Privileges | undefined | null) => (privilege: Privilege) => {
    const [section, requiredPrivilege] = privilege;
    if (isPrivileges(privileges) && !privileges.missingPrivileges[section]) {
      // if the section does not exist in our missingPrivileges, everything is OK
      return true;
    }
    if (isPrivileges(privileges) && privileges.missingPrivileges[section]!.length === 0) {
      return true;
    }
    if (requiredPrivilege === '*') {
      // If length > 0 and we require them all... KO
      return false;
    }
    // If we require _some_ privilege, we make sure that the one
    // we require is *not* in the missingPrivilege array
    return (
      isPrivileges(privileges) &&
      !privileges.missingPrivileges[section]!.includes(requiredPrivilege)
    );
  };

// create the text for button's tooltips if the user
// doesn't have the permission to press that button
export function createCapabilityFailureMessage(
  capability: keyof Capabilities | 'noTransformNodes'
) {
  let message = '';

  switch (capability) {
    case 'canCreateTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.createTransformTooltip', {
        defaultMessage: 'You do not have permission to create transforms.',
      });
      break;
    case 'canCreateTransformAlerts':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.canCreateTransformAlertsTooltip',
        {
          defaultMessage: 'You do not have permission to create transform alert rules.',
        }
      );
      break;
    case 'canStartStopTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.startOrStopTransformTooltip',
        {
          defaultMessage: 'You do not have permission to start or stop transforms.',
        }
      );
      break;
    case 'canDeleteTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.deleteTransformTooltip', {
        defaultMessage: 'You do not have permission to delete transforms.',
      });
      break;

    case 'canResetTransform':
      message = i18n.translate('xpack.transform.capability.noPermission.resetTransformTooltip', {
        defaultMessage: 'You do not have permission to reset transforms.',
      });
      break;

    case 'noTransformNodes':
      message = i18n.translate('xpack.transform.capability.noPermission.noTransformNodesTooltip', {
        defaultMessage: 'There are no transform nodes available.',
      });
      break;
  }

  return i18n.translate('xpack.transform.capability.pleaseContactAdministratorTooltip', {
    defaultMessage: '{message} Please contact your administrator.',
    values: {
      message,
    },
  });
}
