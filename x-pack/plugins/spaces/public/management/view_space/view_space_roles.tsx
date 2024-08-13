/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Role } from '@kbn/security-plugin-types-common';

import {
  type PrivilegesAPIClient,
  PrivilegesRolesForm,
  type RolesAPIClient,
} from './component/space_assign_role_privilege_form';
import { SpaceAssignedRolesTable } from './component/space_assigned_roles_table';
import { useViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';

interface Props {
  space: Space;
  /**
   * List of roles assigned to this space
   */
  roles: Role[];
  features: KibanaFeature[];
  isReadOnly: boolean;
}

// FIXME: rename to EditSpaceAssignedRoles
export const ViewSpaceAssignedRoles: FC<Props> = ({ space, roles, features, isReadOnly }) => {
  const [roleAPIClientInitialized, setRoleAPIClientInitialized] = useState(false);
  const [spaceUnallocatedRole, setSpaceUnallocatedRole] = useState<Role[]>([]);

  const rolesAPIClient = useRef<RolesAPIClient>();
  const privilegesAPIClient = useRef<PrivilegesAPIClient>();

  const {
    getRolesAPIClient,
    getUrlForApp,
    getPrivilegesAPIClient,
    overlays,
    theme,
    i18n: i18nStart,
    notifications,
  } = useViewSpaceServices();

  const resolveAPIClients = useCallback(async () => {
    try {
      [rolesAPIClient.current, privilegesAPIClient.current] = await Promise.all([
        getRolesAPIClient(),
        getPrivilegesAPIClient(),
      ]);
      setRoleAPIClientInitialized(true);
    } catch {
      //
    }
  }, [getPrivilegesAPIClient, getRolesAPIClient]);

  useEffect(() => {
    if (!isReadOnly) {
      resolveAPIClients();
    }
  }, [isReadOnly, resolveAPIClients]);

  useEffect(() => {
    async function fetchAllSystemRoles() {
      const systemRoles = (await rolesAPIClient.current?.getRoles()) ?? [];

      // exclude roles that are already assigned to this space
      const spaceUnallocatedRoles = systemRoles.filter(
        (role) =>
          !role.metadata?._reserved &&
          role.kibana.some((privileges) => {
            return !privileges.spaces.includes(space.id) && !privileges.spaces.includes('*');
          })
      );

      setSpaceUnallocatedRole(spaceUnallocatedRoles);
    }

    if (roleAPIClientInitialized) {
      fetchAllSystemRoles?.();
    }
  }, [roleAPIClientInitialized, space.id]);

  const showRolesPrivilegeEditor = useCallback(
    (defaultSelected?: Role[]) => {
      const overlayRef = overlays.openFlyout(
        toMountPoint(
          <PrivilegesRolesForm
            {...{
              space,
              features,
              onSaveCompleted: () => {
                notifications.toasts.addSuccess(
                  i18n.translate(
                    'xpack.spaces.management.spaceDetails.roles.assignmentSuccessMsg',
                    {
                      defaultMessage: `Selected roles have been assigned to the {spaceName} space`,
                      values: {
                        spaceName: space.name,
                      },
                    }
                  )
                );
                overlayRef.close();
              },
              closeFlyout: () => overlayRef.close(),
              defaultSelected,
              spaceUnallocatedRole,
              // APIClient would have been initialized before the privilege editor is displayed
              roleAPIClient: rolesAPIClient.current!,
              privilegesAPIClient: privilegesAPIClient.current!,
            }}
          />,
          { theme, i18n: i18nStart }
        ),
        {
          size: 's',
        }
      );
    },
    [features, i18nStart, notifications.toasts, overlays, space, spaceUnallocatedRole, theme]
  );

  return (
    <React.Fragment>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.roles.heading"
              defaultMessage="Assign roles to this space so that users with those roles are able to access it. You can create and edit them in {linkToRolesPage}."
              values={{
                linkToRolesPage: (
                  <EuiLink href={getUrlForApp('management', { deepLinkId: 'roles' })}>
                    {i18n.translate(
                      'xpack.spaces.management.spaceDetails.roles.rolesPageAnchorText',
                      { defaultMessage: 'Roles' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <SpaceAssignedRolesTable
            isReadOnly={isReadOnly}
            assignedRoles={roles}
            onClickBulkEdit={showRolesPrivilegeEditor}
            onClickRowEditAction={(rowRecord) => showRolesPrivilegeEditor([rowRecord])}
            onClickBulkRemove={(selectedRoles) => {
              // TODO: add logic to remove selected roles from space
            }}
            onClickRowRemoveAction={(rowRecord) => {
              // TODO: add logic to remove single role from space
            }}
            onClickAssignNewRole={async () => {
              if (!roleAPIClientInitialized) {
                await resolveAPIClients();
              }
              showRolesPrivilegeEditor();
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
};
