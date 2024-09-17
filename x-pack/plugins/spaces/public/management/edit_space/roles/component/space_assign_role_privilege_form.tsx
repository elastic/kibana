/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { KibanaFeature, KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { type RawKibanaPrivileges } from '@kbn/security-authorization-core';
import type { Role } from '@kbn/security-plugin-types-common';
import type { BulkUpdateRoleResponse } from '@kbn/security-plugin-types-public/src/roles/roles_api_client';
import { KibanaPrivileges } from '@kbn/security-role-management-model';
import { KibanaPrivilegeTable, PrivilegeFormCalculator } from '@kbn/security-ui-components';

import type { Space } from '../../../../../common';
import {
  FEATURE_PRIVILEGES_ALL,
  FEATURE_PRIVILEGES_CUSTOM,
  FEATURE_PRIVILEGES_READ,
} from '../../../../../common/constants';
import { type EditSpaceServices, type EditSpaceStore, useEditSpaceServices } from '../../provider';

type KibanaRolePrivilege =
  | keyof NonNullable<KibanaFeatureConfig['privileges']>
  | typeof FEATURE_PRIVILEGES_CUSTOM;

interface PrivilegesRolesFormProps {
  space: Space;
  features: KibanaFeature[];
  closeFlyout: () => void;
  onSaveCompleted: (response: BulkUpdateRoleResponse) => void;
  /**
   * @description default roles that should be selected when the form is opened,
   * this is useful when the form is opened in edit mode
   */
  defaultSelected?: Role[];
  storeDispatch: EditSpaceStore['dispatch'];
  spacesClientsInvocator: EditSpaceServices['invokeClient'];
  getUrlForApp: EditSpaceServices['getUrlForApp'];
}

const createRolesComboBoxOptions = (roles: Role[]): Array<EuiComboBoxOptionOption<Role>> =>
  roles.map((role) => ({
    label: role.name,
    value: role,
  }));

export const PrivilegesRolesForm: FC<PrivilegesRolesFormProps> = (props) => {
  const {
    space,
    onSaveCompleted,
    closeFlyout,
    features,
    defaultSelected = [],
    spacesClientsInvocator,
    storeDispatch,
    getUrlForApp,
  } = props;
  const { logger, notifications } = useEditSpaceServices();
  const [assigningToRole, setAssigningToRole] = useState(false);
  const [fetchingDataDeps, setFetchingDataDeps] = useState(false);
  const [kibanaPrivileges, setKibanaPrivileges] = useState<RawKibanaPrivileges | null>(null);
  const [spaceUnallocatedRoles, setSpaceUnallocatedRole] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<ReturnType<typeof createRolesComboBoxOptions>>(
    createRolesComboBoxOptions(defaultSelected)
  );

  useEffect(() => {
    async function fetchRequiredData(spaceId: string) {
      setFetchingDataDeps(true);

      const [systemRoles, _kibanaPrivileges] = await spacesClientsInvocator((clients) =>
        Promise.all([
          clients.rolesClient.getRoles(),
          clients.privilegesClient.getAll({ includeActions: true, respectLicenseLevel: false }),
        ])
      );

      // exclude roles that are already assigned to this space
      setSpaceUnallocatedRole(
        systemRoles.filter(
          (role) =>
            !role.metadata?._reserved &&
            (!role.kibana.length ||
              role.kibana.every((rolePrivileges) => {
                return !(
                  rolePrivileges.spaces.includes(spaceId) || rolePrivileges.spaces.includes('*')
                );
              }))
        )
      );

      setKibanaPrivileges(_kibanaPrivileges);
    }

    fetchRequiredData(space.id!).finally(() => setFetchingDataDeps(false));
  }, [space.id, spacesClientsInvocator]);

  const selectedRolesCombinedPrivileges = useMemo(() => {
    const combinedPrivilege = new Set(
      selectedRoles.reduce((result, selectedRole) => {
        let match: KibanaRolePrivilege[] = [];
        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          const { spaces, base } = selectedRole.value!.kibana[i];
          if (spaces.includes(space.id!)) {
            match = (base.length ? base : [FEATURE_PRIVILEGES_CUSTOM]) as [KibanaRolePrivilege];
            break;
          }
        }

        return result.concat(match);
      }, [] as KibanaRolePrivilege[])
    );

    return Array.from(combinedPrivilege);
  }, [selectedRoles, space.id]);

  const [roleSpacePrivilege, setRoleSpacePrivilege] = useState<KibanaRolePrivilege>(
    !selectedRoles.length || !selectedRolesCombinedPrivileges.length
      ? FEATURE_PRIVILEGES_ALL
      : selectedRolesCombinedPrivileges[0]
  );

  const [roleCustomizationAnchor, setRoleCustomizationAnchor] = useState<{
    value: Role;
    privilegeIndex: number;
  }>(() => {
    if (!selectedRoles.length) {
      // return a skeleton anchor on init when no roles are selected
      return {
        value: {
          name: 'placeholder',
          elasticsearch: {
            cluster: [],
            run_as: [],
            indices: [],
          },
          kibana: [
            {
              spaces: [space.id],
              base: [roleSpacePrivilege === FEATURE_PRIVILEGES_CUSTOM ? '' : roleSpacePrivilege],
              feature: {},
            },
          ],
        },
        privilegeIndex: 0,
      };
    }

    // support instance where the form is opened with roles already preselected
    const defaultAnchor = selectedRoles[0]?.value!;
    const privilegeIndex = defaultAnchor.kibana.findIndex(({ spaces }) =>
      spaces.includes(space.id!)
    );

    return {
      value: defaultAnchor,
      privilegeIndex: (privilegeIndex || -1) >= 0 ? privilegeIndex : 0,
    };
  });

  /**
   * @description computes the value anchor role that will be used as the starting point for granular customizations
   * on the selected roles.
   */
  const computeRoleCustomizationAnchor = useCallback(
    (spaceId: string, _selectedRoles: ReturnType<typeof createRolesComboBoxOptions>) => {
      let anchor: typeof roleCustomizationAnchor | null = null;

      for (let i = 0; i < _selectedRoles.length; i++) {
        let role;

        if ((role = _selectedRoles[i].value)) {
          for (let j = 0; j < _selectedRoles[i].value!.kibana.length; j++) {
            let privilegeIterationIndexValue;

            if ((privilegeIterationIndexValue = role.kibana[j])) {
              const { spaces, base } = privilegeIterationIndexValue;
              /*
               * check to see if current role already has a custom privilege, if it does we use that as the starting point for all customizations
               * that will happen to all the other selected roles and exit
               */
              if (spaces.includes(spaceId) && !base.length) {
                anchor = {
                  value: structuredClone(role),
                  privilegeIndex: j,
                };

                break;
              }
            }
          }
        }

        if (anchor) break;

        // provide a fallback anchor if no suitable anchor was discovered, and we have reached the end of selected roles iteration
        if (!anchor && role && i === _selectedRoles.length - 1) {
          const fallbackRole = structuredClone(role);

          const spacePrivilegeIndex = fallbackRole.kibana.findIndex(({ spaces }) =>
            spaces.includes(spaceId)
          );

          anchor = {
            value: fallbackRole,
            privilegeIndex:
              (spacePrivilegeIndex || -1) >= 0
                ? spacePrivilegeIndex
                : (fallbackRole?.kibana?.push?.({
                    spaces: [spaceId],
                    base: [],
                    feature: {},
                  }) || 0) - 1,
          };
        }
      }

      return anchor;
    },
    []
  );

  const onRoleSpacePrivilegeChange = useCallback(
    (spacePrivilege: KibanaRolePrivilege) => {
      if (spacePrivilege === FEATURE_PRIVILEGES_CUSTOM) {
        const _roleCustomizationAnchor = computeRoleCustomizationAnchor(space.id, selectedRoles);
        if (_roleCustomizationAnchor) setRoleCustomizationAnchor(_roleCustomizationAnchor);
      } else {
        // opt for simple updates for customization anchor when privilege is not a custom one, especially that it's used only for visual treatment
        setRoleCustomizationAnchor(({ value, privilegeIndex }) => {
          value.kibana[privilegeIndex!] = {
            spaces: [space.id],
            base: [spacePrivilege],
            feature: {},
          };

          return { value, privilegeIndex };
        });
      }

      // persist selected privilege for UI
      setRoleSpacePrivilege(spacePrivilege);
    },
    [computeRoleCustomizationAnchor, selectedRoles, space.id]
  );

  const assignRolesToSpace = useCallback(async () => {
    try {
      setAssigningToRole(true);

      const newPrivileges = {
        base: roleSpacePrivilege === FEATURE_PRIVILEGES_CUSTOM ? [] : [roleSpacePrivilege],
        feature:
          roleSpacePrivilege === FEATURE_PRIVILEGES_CUSTOM
            ? roleCustomizationAnchor.value?.kibana[roleCustomizationAnchor.privilegeIndex!]
                .feature!
            : {},
      };

      const updatedRoles = structuredClone(selectedRoles).map((selectedRole) => {
        let found = false;

        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          const { spaces } = selectedRole.value!.kibana[i];

          if (spaces.includes(space.id!)) {
            if (spaces.length > 1) {
              // account for instance where current space belongs to a collection of other spaces that share the same privileges that are grouped together,
              // since we intend to apply the new privilege exclusively to the current space
              // we remove the space from the shared privilege.
              spaces.splice(i, 1);
            } else {
              Object.assign(selectedRole.value!.kibana[i], newPrivileges);
              found = true;
            }

            break;
          }
        }

        if (!found) {
          selectedRole.value?.kibana.push(Object.assign({ spaces: [space.id] }, newPrivileges));
        }

        return selectedRole.value!;
      });

      await spacesClientsInvocator((clients) =>
        clients.rolesClient.bulkUpdateRoles({ rolesUpdate: updatedRoles }).then((response) => {
          setAssigningToRole(false);
          onSaveCompleted(response);
        })
      );

      storeDispatch({
        type: 'update_roles',
        payload: updatedRoles,
      });
    } catch (error) {
      logger.error('Could not assign role to space!', error);
      const message = error?.body?.message ?? error.toString();

      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.spaces.management.spaceDetails.errorAssigningRoleTitle', {
          defaultMessage: 'Error assigning role to space: {message}',
          values: { message },
        }),
      });
    }
  }, [
    selectedRoles,
    spacesClientsInvocator,
    storeDispatch,
    onSaveCompleted,
    space.id,
    roleSpacePrivilege,
    roleCustomizationAnchor,
    logger,
    notifications.toasts,
  ]);

  const getForm = () => {
    return (
      <EuiForm component="form" fullWidth>
        <React.Fragment>
          {!defaultSelected.length && (
            <EuiFormRow
              label={i18n.translate(
                'xpack.spaces.management.spaceDetails.roles.selectRolesFormRowLabel',
                { defaultMessage: 'Select roles(s)' }
              )}
              labelAppend={
                <EuiLink href={getUrlForApp('management', { deepLinkId: 'roles' })}>
                  {i18n.translate(
                    'xpack.spaces.management.spaceDetails.roles.selectRolesFormRowLabelAnchor',
                    { defaultMessage: 'Manage roles' }
                  )}
                </EuiLink>
              }
              helpText={i18n.translate(
                'xpack.spaces.management.spaceDetails.roles.selectRolesHelp',
                {
                  defaultMessage: 'Select Kibana spaces to which you wish to assign privileges.',
                }
              )}
            >
              <EuiComboBox
                data-test-subj="space-assign-role-selection-combo-box"
                aria-label={i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.selectRoles',
                  {
                    defaultMessage: 'Select role to assign to the "{spaceName}" space',
                    values: { spaceName: space.name },
                  }
                )}
                isLoading={fetchingDataDeps}
                options={createRolesComboBoxOptions(spaceUnallocatedRoles)}
                selectedOptions={selectedRoles}
                onChange={(value) => setSelectedRoles(value)}
                fullWidth
              />
            </EuiFormRow>
          )}
        </React.Fragment>
        <EuiFormRow>
          {selectedRolesCombinedPrivileges.length > 1 ? (
            <EuiCallOut
              size="s"
              color="warning"
              iconType="iInCircle"
              data-test-subj="privilege-conflict-callout"
              title={i18n.translate(
                'xpack.spaces.management.spaceDetails.roles.assign.privilegeConflictMsg.title',
                {
                  defaultMessage: 'Selected roles have different privileges granted',
                }
              )}
            >
              {i18n.translate(
                'xpack.spaces.management.spaceDetails.roles.assign.privilegeConflictMsg.description',
                {
                  defaultMessage:
                    'Updating the settings here in a bulk will override current individual settings.',
                }
              )}
            </EuiCallOut>
          ) : (
            <EuiCallOut
              size="s"
              color="primary"
              iconType="iInCircle"
              data-test-subj="privilege-info-callout"
              title={i18n.translate(
                'xpack.spaces.management.spaceDetails.roles.assign.privilegeConflictMsg.title',
                {
                  defaultMessage: 'Privileges will apply to all current and future spaces.',
                }
              )}
            />
          )}
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate(
            'xpack.spaces.management.spaceDetails.roles.assign.privilegesLabelText',
            {
              defaultMessage: 'Define role privileges',
            }
          )}
        >
          <EuiButtonGroup
            data-test-subj="space-assign-role-privilege-selection-switch"
            legend={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.assign.privilegeSelectionLegendText',
              {
                defaultMessage: 'select the privilege for the features enabled in this space',
              }
            )}
            isDisabled={!Boolean(selectedRoles.length)}
            options={[
              {
                id: FEATURE_PRIVILEGES_ALL,
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.all',
                  {
                    defaultMessage: 'All',
                  }
                ),
              },
              {
                id: FEATURE_PRIVILEGES_READ,
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.read',
                  { defaultMessage: 'Read' }
                ),
              },
              {
                id: FEATURE_PRIVILEGES_CUSTOM,
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.custom',
                  { defaultMessage: 'Customize' }
                ),
              },
            ].map((privilege) => ({
              ...privilege,
              'data-test-subj': `${privilege.id}-privilege-button`,
            }))}
            color="primary"
            idSelected={roleSpacePrivilege}
            onChange={(id) => onRoleSpacePrivilegeChange(id as KibanaRolePrivilege)}
            isFullWidth
          />
        </EuiFormRow>
        {Boolean(selectedRoles.length) && (
          <EuiFormRow data-test-subj="space-assign-role-privilege-customization-form">
            <React.Fragment>
              {!kibanaPrivileges ? (
                <EuiLoadingSpinner size="l" />
              ) : (
                <KibanaPrivilegeTable
                  showTitle={false}
                  disabled={roleSpacePrivilege !== FEATURE_PRIVILEGES_CUSTOM}
                  role={roleCustomizationAnchor.value!}
                  privilegeIndex={roleCustomizationAnchor.privilegeIndex}
                  onChange={(featureId, selectedPrivileges) => {
                    // apply selected changes only to the designated customization anchor, this way we delay reconciling the intending privileges
                    // to all of the selected roles till we decide to commit the changes chosen
                    setRoleCustomizationAnchor(({ value, privilegeIndex }) => {
                      let privilege;

                      if ((privilege = value!.kibana?.[privilegeIndex!])) {
                        privilege.feature[featureId] = selectedPrivileges;
                      }

                      return { value, privilegeIndex };
                    });
                  }}
                  onChangeAll={(_privilege) => {
                    // apply selected changes only to the designated customization anchor, this way we delay reconciling the intending privileges
                    // to all of the selected roles till we decide to commit the changes chosen
                    setRoleCustomizationAnchor(({ value, privilegeIndex }) => {
                      let privilege;

                      if ((privilege = value!.kibana?.[privilegeIndex!])) {
                        privilege.base = _privilege;
                      }

                      return { value, privilegeIndex };
                    });
                  }}
                  kibanaPrivileges={new KibanaPrivileges(kibanaPrivileges, features)}
                  privilegeCalculator={
                    new PrivilegeFormCalculator(
                      new KibanaPrivileges(kibanaPrivileges, features),
                      roleCustomizationAnchor.value!
                    )
                  }
                  allSpacesSelected={false}
                  canCustomizeSubFeaturePrivileges={false}
                />
              )}
            </React.Fragment>
          </EuiFormRow>
        )}
      </EuiForm>
    );
  };

  const getSaveButton = useCallback(() => {
    return (
      <EuiButton
        fill
        disabled={!selectedRoles.length}
        isLoading={assigningToRole}
        onClick={() => assignRolesToSpace()}
        data-test-subj="space-assign-role-create-roles-privilege-button"
      >
        {i18n.translate('xpack.spaces.management.spaceDetails.roles.assignRoleButton', {
          defaultMessage: 'Assign roles',
        })}
      </EuiButton>
    );
  }, [assignRolesToSpace, assigningToRole, selectedRoles.length]);

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {defaultSelected.length
              ? i18n.translate('xpack.spaces.management.spaceDetails.roles.assignRoleButton', {
                  defaultMessage: 'Edit role privileges',
                })
              : i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.custom',
                  {
                    defaultMessage: 'Assign roles to space',
                  }
                )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.privilegeForm.heading"
              defaultMessage="Define the privileges a given role should have in this space."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{getForm()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              flush="left"
              data-test-subj="space-assign-role-cancel-roles-privilege-button"
            >
              {i18n.translate('xpack.spaces.management.spaceDetails.roles.cancelRoleButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{getSaveButton()}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </React.Fragment>
  );
};
