/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { cloneDeep } from 'lodash';
import { APP_INDEX_PRIVILEGES } from '../constants';
import { Privileges } from '../types/privileges';

export interface PrivilegesAndCapabilities {
  privileges: Privileges;
  capabilities: Capabilities;
}

export interface TransformCapabilities {
  canGetTransform: boolean;
  canDeleteTransform: boolean;
  canPreviewTransform: boolean;
  canCreateTransform: boolean;
  canReauthorizeTransform: boolean;
  canScheduleNowTransform: boolean;
  canStartStopTransform: boolean;
  canCreateTransformAlerts: boolean;
  canUseTransformAlerts: boolean;
  canResetTransform: boolean;
}
export type Capabilities = { [k in keyof TransformCapabilities]: boolean };

export const INITIAL_CAPABILITIES = Object.freeze<Capabilities>({
  canGetTransform: false,
  canDeleteTransform: false,
  canPreviewTransform: false,
  canCreateTransform: false,
  canReauthorizeTransform: false,
  canScheduleNowTransform: false,
  canStartStopTransform: false,
  canCreateTransformAlerts: false,
  canUseTransformAlerts: false,
  canResetTransform: false,
});

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

export const extractMissingPrivileges = (
  privilegesObject: { [key: string]: boolean } = {}
): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

export const getPrivilegesAndCapabilities = (
  clusterPrivileges: Record<string, boolean>,
  hasOneIndexWithAllPrivileges: boolean,
  hasAllPrivileges: boolean
): PrivilegesAndCapabilities => {
  const privilegesResult: Privileges = {
    hasAllPrivileges: true,
    missingPrivileges: {
      cluster: [],
      index: [],
    },
  };

  // Find missing cluster privileges and set overall app privileges
  privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(clusterPrivileges);
  privilegesResult.hasAllPrivileges = hasAllPrivileges;

  if (!hasOneIndexWithAllPrivileges) {
    privilegesResult.missingPrivileges.index = [...APP_INDEX_PRIVILEGES];
  }

  const hasPrivilege = hasPrivilegeFactory(privilegesResult);

  const capabilities = cloneDeep<Capabilities>(INITIAL_CAPABILITIES);
  capabilities.canGetTransform =
    hasPrivilege(['cluster', 'cluster:monitor/transform/get']) &&
    hasPrivilege(['cluster', 'cluster:monitor/transform/stats/get']);

  capabilities.canCreateTransform = hasPrivilege(['cluster', 'cluster:admin/transform/put']);

  capabilities.canDeleteTransform = hasPrivilege(['cluster', 'cluster:admin/transform/delete']);

  capabilities.canResetTransform = hasPrivilege(['cluster', 'cluster:admin/transform/reset']);

  capabilities.canPreviewTransform = hasPrivilege(['cluster', 'cluster:admin/transform/preview']);

  capabilities.canStartStopTransform =
    hasPrivilege(['cluster', 'cluster:admin/transform/start']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/start_task']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/stop']);

  capabilities.canCreateTransformAlerts = capabilities.canCreateTransform;

  capabilities.canUseTransformAlerts = capabilities.canGetTransform;

  capabilities.canScheduleNowTransform = capabilities.canStartStopTransform;

  capabilities.canReauthorizeTransform = capabilities.canStartStopTransform;

  return { privileges: privilegesResult, capabilities };
};
// create the text for button's tooltips if the user
// doesn't have the permission to press that button
export function createCapabilityFailureMessage(
  capability: keyof TransformCapabilities | 'noTransformNodes'
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
    case 'canScheduleNowTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.scheduleNowTransformTooltip',
        {
          defaultMessage:
            'You do not have permission to schedule transforms to process data instantly.',
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

    case 'canReauthorizeTransform':
      message = i18n.translate(
        'xpack.transform.capability.noPermission.reauthorizeTransformTooltip',
        {
          defaultMessage: 'You do not have permission to reauthorize transforms.',
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
