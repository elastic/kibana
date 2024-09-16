/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Role } from '@kbn/security-plugin-types-common';

import { handleApiError } from './handle_api_error';
import { EditSpaceProvider, useEditSpaceServices, useEditSpaceStore } from './provider';
import { PrivilegesRolesForm } from './roles/component/space_assign_role_privilege_form';
import { SpaceAssignedRolesTable } from './roles/component/space_assigned_roles_table';
import type { Space } from '../../../common';

interface Props {
  space: Space;
  features: KibanaFeature[];
  isReadOnly: boolean;
}

export const EditSpaceAssignedRolesTab: FC<Props> = ({ space, features, isReadOnly }) => {
  const { dispatch, state } = useEditSpaceStore(); // no loading state because roles have already been loaded
  const services = useEditSpaceServices();
  const {
    getUrlForApp,
    overlays,
    theme,
    i18n: i18nStart,
    logger,
    notifications,
    invokeClient,
  } = services;

  // Roles are already loaded in app state, refresh them when user navigates to this tab
  useEffect(() => {
    const getRoles = async () => {
      await invokeClient(async (clients) => {
        let result: Role[] = [];
        try {
          result = await clients.spacesManager.getRolesForSpace(space.id);

          dispatch({ type: 'update_roles', payload: result });
        } catch (error) {
          handleApiError(error, { logger, toasts: notifications.toasts });
        }
      });
    };

    getRoles();
  }, [dispatch, invokeClient, space.id, logger, notifications.toasts]);

  const showRolesPrivilegeEditor = useCallback(
    (defaultSelected?: Role[]) => {
      const overlayRef = overlays.openFlyout(
        toMountPoint(
          <EditSpaceProvider {...services}>
            <PrivilegesRolesForm
              {...{
                space,
                features,
                onSaveCompleted: (response) => {
                  const { updated, errors } = response;

                  if (updated) {
                    notifications.toasts.addSuccess(
                      i18n.translate(
                        'xpack.spaces.management.spaceDetails.roles.assignmentSuccessMsg',
                        {
                          defaultMessage: `Selected roles have been assigned to the "{spaceName}" space`,
                          values: { spaceName: space.name },
                        }
                      )
                    );
                  }

                  for (const [roleName, error] of Object.entries(errors ?? {})) {
                    notifications.toasts.addError(new Error(JSON.stringify(error)), {
                      title: `Error updating ${roleName}`,
                    });
                  }
                  overlayRef.close();
                },
                closeFlyout: () => overlayRef.close(),
                defaultSelected,
                storeDispatch: dispatch,
                spacesClientsInvocator: invokeClient,
              }}
            />
          </EditSpaceProvider>,
          { theme, i18n: i18nStart }
        ),
        {
          size: 'm',
          maxWidth: true,
          maskProps: { headerZindexLocation: 'below' },
        }
      );
    },
    [
      dispatch,
      features,
      i18nStart,
      invokeClient,
      notifications.toasts,
      overlays,
      space,
      theme,
      services,
    ]
  );

  const removeRole = useCallback(
    async (payload: Role[]) => {
      // To remove the role from the space in bulk-edit, we take the payload of roles to edit, loop over
      // each role, and modify the kibana.spaces field of each role by stripping them of the space to
      // disassociate
      const updateDoc = structuredClone(payload).map((roleDef) => {
        roleDef.kibana = roleDef.kibana.filter(({ spaces }) => {
          let spaceIdIndex: number;

          if (spaces.length && (spaceIdIndex = spaces.indexOf(space.id)) > -1) {
            if (spaces.length > 1) {
              spaces.splice(spaceIdIndex, 1);
              return true;
            } else {
              return false;
            }
          }
          return true;
        });

        return roleDef;
      });

      await invokeClient((clients) => {
        return clients.rolesClient.bulkUpdateRoles({ rolesUpdate: updateDoc }).then((response) => {
          const { updated, errors } = response;

          if (updated) {
            notifications.toasts.addSuccess(
              i18n.translate('xpack.spaces.management.spaceDetails.roles.removalSuccessMsg', {
                defaultMessage:
                  'Removed {count, plural, one {role} other {{count} roles}} from "{spaceName}" space',
                values: {
                  spaceName: space.name,
                  count: updateDoc.length,
                },
              })
            );
          }

          for (const [roleName, error] of Object.entries(errors ?? {})) {
            notifications.toasts.addError(new Error(JSON.stringify(error)), {
              title: `Error updating ${roleName}`,
            });
          }
        });
      });

      dispatch({ type: 'remove_roles', payload: updateDoc });
    },
    [dispatch, invokeClient, notifications.toasts, space.id, space.name]
  );

  return (
    <React.Fragment>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.roles.heading"
              defaultMessage="Assign roles to this space. Users with these roles can access and use the space according to the privileges that you set."
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <SpaceAssignedRolesTable
            isReadOnly={isReadOnly}
            currentSpace={space}
            assignedRoles={state.roles}
            onClickRowEditAction={(rowRecord) => showRolesPrivilegeEditor([rowRecord])}
            onClickBulkRemove={async (selectedRoles) => {
              await removeRole(selectedRoles);
            }}
            onClickRowRemoveAction={async (rowRecord) => {
              await removeRole([rowRecord]);
            }}
            onClickAssignNewRole={async () => {
              showRolesPrivilegeEditor();
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
};
