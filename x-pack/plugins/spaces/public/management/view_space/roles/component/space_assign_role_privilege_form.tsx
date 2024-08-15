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
import type { Role } from '@kbn/security-plugin-types-common';
import { KibanaPrivileges, type RawKibanaPrivileges } from '@kbn/security-role-management-model';
import { KibanaPrivilegeTable, PrivilegeFormCalculator } from '@kbn/security-ui-components';

import type { Space } from '../../../../../common';
import type { ViewSpaceServices, ViewSpaceStore } from '../../provider';

type KibanaRolePrivilege = keyof NonNullable<KibanaFeatureConfig['privileges']> | 'custom';

interface PrivilegesRolesFormProps {
  space: Space;
  features: KibanaFeature[];
  closeFlyout: () => void;
  onSaveCompleted: () => void;
  defaultSelected?: Role[];
  storeDispatch: ViewSpaceStore['dispatch'];
  spacesClientsInvocator: ViewSpaceServices['invokeClient'];
}

const createRolesComboBoxOptions = (roles: Role[]): Array<EuiComboBoxOptionOption<Role>> =>
  roles.map((role) => ({
    label: role.name,
    value: role,
  }));

export const PrivilegesRolesForm: FC<PrivilegesRolesFormProps> = (props) => {
  const {
    onSaveCompleted,
    closeFlyout,
    features,
    defaultSelected = [],
    spacesClientsInvocator,
    storeDispatch,
  } = props;
  const [space, setSpaceState] = useState<Partial<Space>>(props.space);
  const [assigningToRole, setAssigningToRole] = useState(false);
  const [fetchingSystemRoles, setFetchingSystemRoles] = useState(false);
  const [privileges, setPrivileges] = useState<[RawKibanaPrivileges] | null>(null);
  const [spaceUnallocatedRoles, setSpaceUnallocatedRole] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<ReturnType<typeof createRolesComboBoxOptions>>(
    createRolesComboBoxOptions(defaultSelected)
  );
  const selectedRolesCombinedPrivileges = useMemo(() => {

    const combinedPrivilege = new Set(
      selectedRoles.reduce((result, selectedRole) => {
        let match: Array<Exclude<KibanaRolePrivilege, 'custom'>> = [];
        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          if (selectedRole.value!.kibana[i].spaces.includes(space.id!)) {
            // @ts-ignore - TODO resolve this
            match = selectedRole.value!.kibana[i].base;
            break;
          }
        }

        return result.concat(match);
      }, [] as Array<Exclude<KibanaRolePrivilege, 'custom'>>)
    );

    return Array.from(combinedPrivilege);
  }, [selectedRoles, space.id]);

  const [roleSpacePrivilege, setRoleSpacePrivilege] = useState<KibanaRolePrivilege>(
    selectedRolesCombinedPrivileges.length === 1 ? selectedRolesCombinedPrivileges[0] : 'all'
  );

  useEffect(() => {
    async function fetchAllSystemRoles() {
      setFetchingSystemRoles(true);
      const systemRoles = await spacesClientsInvocator((clients) => clients.rolesClient.getRoles());

      // exclude roles that are already assigned to this space
      setSpaceUnallocatedRole(
        systemRoles.filter(
          (role) =>
            !role.metadata?._reserved &&
            (!role.kibana.length ||
              role.kibana.every((rolePrivileges) => {
                return !(
                  rolePrivileges.spaces.includes(space.id!) || rolePrivileges.spaces.includes('*')
                );
              }))
        )
      );
    }

    fetchAllSystemRoles().finally(() => setFetchingSystemRoles(false));
  }, [space.id, spacesClientsInvocator]);

  useEffect(() => {
    Promise.all([
      spacesClientsInvocator((clients) =>
        clients.privilegesClient.getAll({ includeActions: true, respectLicenseLevel: false })
      ),
      spacesClientsInvocator((clients) => clients.privilegesClient.getBuiltIn()),
    ]).then(
      ([kibanaPrivileges, builtInESPrivileges]) =>
        setPrivileges([kibanaPrivileges, builtInESPrivileges])
      // (err) => fatalErrors.add(err)
    );
  }, [spacesClientsInvocator]);

  const onRoleSpacePrivilegeChange = useCallback(
    (spacePrivilege: KibanaRolePrivilege) => {
      // persist select privilege for UI
      setRoleSpacePrivilege(spacePrivilege);

      // update preselected roles with new privilege
      setSelectedRoles((prevSelectedRoles) => {
        return structuredClone(prevSelectedRoles).map((selectedRole) => {
          for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
            if (selectedRole.value!.kibana[i].spaces.includes(space.id!)) {
              selectedRole.value!.kibana[i].base =
                spacePrivilege === 'custom' ? [] : [spacePrivilege];
              break;
            }
          }

          return selectedRole;
        });
      });
    },
    [space.id]
  );

  const assignRolesToSpace = useCallback(async () => {
    try {
      setAssigningToRole(true);

      const updatedRoles = selectedRoles.map((role) => role.value!);

      await spacesClientsInvocator((clients) =>
        clients.rolesClient
          .bulkUpdateRoles({ rolesUpdate: updatedRoles })
          .then(setAssigningToRole.bind(null, false))
      );

      storeDispatch({
        type: 'update_roles',
        payload: updatedRoles,
      });

      onSaveCompleted();
    } catch (err) {
      // Handle resulting error
    }
  }, [onSaveCompleted, selectedRoles, spacesClientsInvocator, storeDispatch]);

  const getForm = () => {
    return (
      <EuiForm component="form" fullWidth>
        <EuiFormRow label="Select a role(s)">
          <EuiComboBox
            data-test-subj="roleSelectionComboBox"
            aria-label={i18n.translate('xpack.spaces.management.spaceDetails.roles.selectRoles', {
              defaultMessage: 'Select role to assign to the {spaceName} space',
              values: { spaceName: space.name },
            })}
            isLoading={fetchingSystemRoles}
            placeholder={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.selectRolesPlaceholder',
              {
                defaultMessage: 'Select roles',
              }
            )}
            options={createRolesComboBoxOptions(spaceUnallocatedRoles)}
            selectedOptions={selectedRoles}
            onChange={(value) => {
              setSelectedRoles((prevRoles) => {
                if (prevRoles.length < value.length) {
                  const newlyAdded = value[value.length - 1];
                  const { id: spaceId } = space;

                  if (!spaceId) {
                    throw new Error('space state requires space to have an ID');
                  }

                  // Add new kibana privilege definition particular for the current space to role
                  newlyAdded.value!.kibana.push({
                    base: roleSpacePrivilege === 'custom' ? [] : [roleSpacePrivilege],
                    feature: {},
                    spaces: [spaceId],
                  });

                  return prevRoles.concat(newlyAdded);
                } else {
                  return value;
                }
              });
            }}
            fullWidth
          />
        </EuiFormRow>
        <>
          {selectedRolesCombinedPrivileges.length > 1 && (
            <EuiFormRow>
              <EuiCallOut
                color="warning"
                iconType="iInCircle"
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
            </EuiFormRow>
          )}
        </>
        <EuiFormRow
          helpText={i18n.translate(
            'xpack.spaces.management.spaceDetails.roles.assign.privilegesHelpText',
            {
              defaultMessage:
                'Assign the privilege you wish to grant to all present and future features across this space',
            }
          )}
        >
          <EuiButtonGroup
            legend="select the privilege for the features enabled in this space"
            isDisabled={!Boolean(selectedRoles.length)}
            options={[
              {
                id: 'all',
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.all',
                  {
                    defaultMessage: 'All',
                  }
                ),
              },
              {
                id: 'read',
                label: i18n.translate(
                  'xpack.spaces.management.spaceDetails.roles.assign.privileges.read',
                  { defaultMessage: 'Read' }
                ),
              },
              {
                id: 'custom',
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
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFormRow>
        {roleSpacePrivilege === 'custom' && (
          <EuiFormRow
            label={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.assign.privileges.customizeLabelText',
              { defaultMessage: 'Customize by feature' }
            )}
          >
            <>
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.spaces.management.spaceDetails.roles.assign.privileges.customizeDescriptionText"
                    defaultMessage="Increase privilege levels per feature basis. Some features might be hidden by the
                    space or affected by a global space privilege"
                  />
                </p>
              </EuiText>
              <EuiSpacer />
              {/** TODO: rework privilege table to accommodate operating on multiple roles */}
              <KibanaPrivilegeTable
                role={selectedRoles[0].value!}
                privilegeIndex={0}
                onChange={(...args) => {
                  console.log('value returned from change!', args);
                  // setSpaceState()
                }}
                onChangeAll={(privilege) => {
                  // setSelectedRoles((prevRoleDefinition) => {
                  //   prevRoleDefinition.slice(0)[0].value?.kibana[0].base.concat(privilege);
                  //   return prevRoleDefinition;
                  // });
                }}
                kibanaPrivileges={new KibanaPrivileges(privileges?.[0]!, features)}
                privilegeCalculator={
                  new PrivilegeFormCalculator(
                    new KibanaPrivileges(privileges?.[0]!, features),
                    selectedRoles[0].value!
                  )
                }
                allSpacesSelected={false}
                canCustomizeSubFeaturePrivileges={false}
              />
            </>
          </EuiFormRow>
        )}
      </EuiForm>
    );
  };

  const getSaveButton = () => {
    return (
      <EuiButton
        fill
        isLoading={assigningToRole}
        onClick={() => assignRolesToSpace()}
        data-test-subj={'createRolesPrivilegeButton'}
      >
        {i18n.translate('xpack.spaces.management.spaceDetails.roles.assignRoleButton', {
          defaultMessage: 'Assign roles',
        })}
      </EuiButton>
    );
  };

  return (
    <React.Fragment>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.spaces.management.spaceDetails.roles.assign.privileges.custom', {
              defaultMessage: 'Assign role to {spaceName}',
              values: { spaceName: space.name },
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.spaces.management.spaceDetails.privilegeForm.heading"
              defaultMessage="Roles will be granted access to the current space according to their default privileges. Use the &lsquo;Customize&rsquo; option to override default privileges."
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
              data-test-subj={'cancelRolesPrivilegeButton'}
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
