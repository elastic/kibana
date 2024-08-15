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
    space,
    onSaveCompleted,
    closeFlyout,
    features,
    defaultSelected = [],
    spacesClientsInvocator,
    storeDispatch,
  } = props;
  const [assigningToRole, setAssigningToRole] = useState(false);
  const [fetchingDataDeps, setFetchingDataDeps] = useState(false);
  const [kibanaPrivileges, setKibanaPrivileges] = useState<RawKibanaPrivileges | null>(null);
  const [spaceUnallocatedRoles, setSpaceUnallocatedRole] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<ReturnType<typeof createRolesComboBoxOptions>>(
    createRolesComboBoxOptions(defaultSelected)
  );
  const [roleCustomizationAnchor, setRoleCustomizationAnchor] = useState({
    value: selectedRoles?.[0]?.value,
    privilegeIndex: 0,
  });

  const selectedRolesCombinedPrivileges = useMemo(() => {
    const combinedPrivilege = new Set(
      selectedRoles.reduce((result, selectedRole) => {
        let match: KibanaRolePrivilege[] = [];
        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          const { spaces, base } = selectedRole.value!.kibana[i];
          if (spaces.includes(space.id!)) {
            // @ts-ignore - TODO resolve this
            match = base.length ? base : ['custom'];
            break;
          }
        }

        return result.concat(match);
      }, [] as KibanaRolePrivilege[])
    );

    return Array.from(combinedPrivilege);
  }, [selectedRoles, space.id]);

  const [roleSpacePrivilege, setRoleSpacePrivilege] = useState<KibanaRolePrivilege>(
    !selectedRoles.length || selectedRolesCombinedPrivileges.length > 1
      ? 'all'
      : selectedRolesCombinedPrivileges[0]
  );

  useEffect(() => {
    async function fetchAllSystemRoles(spaceId: string) {
      setFetchingDataDeps(true);

      const [systemRoles, _kibanaPrivileges] = await Promise.all([
        spacesClientsInvocator((clients) => clients.rolesClient.getRoles()),
        spacesClientsInvocator((clients) =>
          clients.privilegesClient.getAll({ includeActions: true, respectLicenseLevel: false })
        ),
      ]);

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

    fetchAllSystemRoles(space.id!).finally(() => setFetchingDataDeps(false));
  }, [space.id, spacesClientsInvocator]);

  useEffect(() => {
    if (roleSpacePrivilege === 'custom') {
      let anchor: typeof roleCustomizationAnchor | null = null;

      /**
       * when custom privilege is selected we selected the first role that already has a custom privilege
       * and use that as the starting point for all customizations that will happen to all the other selected roles
       */
      for (let i = 0; i < selectedRoles.length; i++) {
        for (let j = 0; i < selectedRoles[i].value?.kibana!.length!; j++) {
          let iterationIndexPrivilegeValue;

          // check that the current iteration has a value, since roles can have uneven privilege defs
          if ((iterationIndexPrivilegeValue = selectedRoles[i].value?.kibana[j])) {
            const { spaces, base } = iterationIndexPrivilegeValue;
            if (spaces.includes(space.id) && !base.length) {
              anchor = {
                value: structuredClone(selectedRoles[i].value),
                privilegeIndex: j,
              };
              break;
            }
          }
        }

        if (anchor) break;
      }

      if (anchor) setRoleCustomizationAnchor(anchor);
    }
  }, [selectedRoles, roleSpacePrivilege, space.id]);

  const onRoleSpacePrivilegeChange = useCallback((spacePrivilege: KibanaRolePrivilege) => {
    // persist selected privilege for UI
    setRoleSpacePrivilege(spacePrivilege);
  }, []);

  const assignRolesToSpace = useCallback(async () => {
    try {
      setAssigningToRole(true);

      const newPrivileges = {
        base: roleSpacePrivilege === 'custom' ? [] : [roleSpacePrivilege],
        feature:
          roleSpacePrivilege === 'custom'
            ? roleCustomizationAnchor.value?.kibana[roleCustomizationAnchor.privilegeIndex].feature!
            : {},
      };

      const updatedRoles = structuredClone(selectedRoles).map((selectedRole) => {
        let found = false;

        // TODO: account for case where previous assignment included multiple spaces assigned to a particular base
        for (let i = 0; i < selectedRole.value!.kibana.length; i++) {
          if (selectedRole.value!.kibana[i].spaces.includes(space.id!)) {
            Object.assign(selectedRole.value!.kibana[i], newPrivileges);
            found = true;
            break;
          }
        }

        if (!found) {
          selectedRole.value?.kibana.push(Object.assign({ spaces: [space.id] }, newPrivileges));
        }

        return selectedRole.value!;
      });

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
  }, [
    selectedRoles,
    spacesClientsInvocator,
    storeDispatch,
    onSaveCompleted,
    space.id,
    roleSpacePrivilege,
    roleCustomizationAnchor,
  ]);

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
            isLoading={fetchingDataDeps}
            placeholder={i18n.translate(
              'xpack.spaces.management.spaceDetails.roles.selectRolesPlaceholder',
              {
                defaultMessage: 'Select roles',
              }
            )}
            options={createRolesComboBoxOptions(spaceUnallocatedRoles)}
            selectedOptions={selectedRoles}
            onChange={(value) => setSelectedRoles(value)}
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
              <React.Fragment>
                {!kibanaPrivileges ? (
                  <p>loading...</p>
                ) : (
                  <KibanaPrivilegeTable
                    role={roleCustomizationAnchor.value!}
                    privilegeIndex={roleCustomizationAnchor.privilegeIndex}
                    onChange={(featureId, selectedPrivileges) => {
                      // apply selected changes only to customization anchor, this delay we delay reconciling the intending privileges
                      //  of the selected roles till we decide to commit the changes chosen
                      setRoleCustomizationAnchor(({ value, privilegeIndex }) => {
                        value!.kibana[privilegeIndex].feature[featureId] = selectedPrivileges;
                        return { value, privilegeIndex };
                      });
                    }}
                    onChangeAll={(privilege) => {
                      // dummy function we wouldn't be using this
                    }}
                    kibanaPrivileges={new KibanaPrivileges(kibanaPrivileges, features)}
                    privilegeCalculator={
                      new PrivilegeFormCalculator(
                        new KibanaPrivileges(kibanaPrivileges, features),
                        selectedRoles[0].value!
                      )
                    }
                    allSpacesSelected={false}
                    canCustomizeSubFeaturePrivileges={false}
                  />
                )}
              </React.Fragment>
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
