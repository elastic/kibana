/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Role } from '@kbn/security-plugin-types-common';

import { useEditSpaceServices, useEditSpaceStore } from './provider';
import { PrivilegesRolesForm } from './roles/component/space_assign_role_privilege_form';
import { SpaceAssignedRolesTable } from './roles/component/space_assigned_roles_table';
import type { Space } from '../../../common';

interface Props {
  space: Space;
  features: KibanaFeature[];
  isReadOnly: boolean;
}

export const EditSpaceAssignedRolesTab: FC<Props> = ({ space, features, isReadOnly }) => {
  const { dispatch, state } = useEditSpaceStore();
  const {
    getUrlForApp,
    overlays,
    theme,
    i18n: i18nStart,
    notifications,
    invokeClient,
  } = useEditSpaceServices();

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
              storeDispatch: dispatch,
              spacesClientsInvocator: invokeClient,
            }}
          />,
          { theme, i18n: i18nStart }
        ),
        {
          size: 'm',
          maxWidth: true,
          maskProps: { headerZindexLocation: 'below' },
        }
      );
    },
    [dispatch, features, i18nStart, invokeClient, notifications.toasts, overlays, space, theme]
  );

  const removeRole = useCallback(
    async (payload: Role[]) => {
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
        return clients.rolesClient.bulkUpdateRoles({ rolesUpdate: updateDoc }).then(() =>
          notifications.toasts.addSuccess(
            i18n.translate('xpack.spaces.management.spaceDetails.roles.removalSuccessMsg', {
              defaultMessage:
                'Removed {count, plural, one {role} other {{count} roles}} from {spaceName} space',
              values: {
                spaceName: space.name,
                count: updateDoc.length,
              },
            })
          )
        );
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
            currentSpace={space}
            assignedRoles={state.roles}
            onClickBulkEdit={showRolesPrivilegeEditor}
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
