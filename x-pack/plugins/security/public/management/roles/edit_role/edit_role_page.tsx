/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ChangeEvent, FunctionComponent, HTMLProps } from 'react';
import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  Capabilities,
  DocLinksStart,
  FatalErrorsSetup,
  HttpStart,
  IHttpFetchError,
  NotificationsStart,
  ScopedHistory,
} from 'src/core/public';
import type { IndexPatternsContract } from 'src/plugins/data/public';

import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';
import type { KibanaFeature } from '../../../../../features/common';
import type { FeaturesPluginStart } from '../../../../../features/public';
import type { Space, SpacesApiUi } from '../../../../../spaces/public';
import type { SecurityLicense } from '../../../../common/licensing';
import type {
  BuiltinESPrivileges,
  RawKibanaPrivileges,
  Role,
  RoleIndexPrivilege,
} from '../../../../common/model';
import {
  isRoleDeprecated as checkIfRoleDeprecated,
  isRoleReadOnly as checkIfRoleReadOnly,
  isRoleReserved as checkIfRoleReserved,
  copyRole,
  getExtendedRoleDeprecationNotice,
  prepareRoleClone,
} from '../../../../common/model';
import type { UserAPIClient } from '../../users';
import type { IndicesAPIClient } from '../indices_api_client';
import { KibanaPrivileges } from '../model';
import type { PrivilegesAPIClient } from '../privileges_api_client';
import type { RolesAPIClient } from '../roles_api_client';
import { DeleteRoleButton } from './delete_role_button';
import { ElasticsearchPrivileges, KibanaPrivilegesRegion } from './privileges';
import { ReservedRoleBadge } from './reserved_role_badge';
import type { RoleValidationResult } from './validate_role';
import { RoleValidator } from './validate_role';

interface Props {
  action: 'edit' | 'clone';
  roleName?: string;
  indexPatterns?: IndexPatternsContract;
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  indicesAPIClient: PublicMethodsOf<IndicesAPIClient>;
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
  privilegesAPIClient: PublicMethodsOf<PrivilegesAPIClient>;
  getFeatures: FeaturesPluginStart['getFeatures'];
  docLinks: DocLinksStart;
  http: HttpStart;
  license: SecurityLicense;
  uiCapabilities: Capabilities;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsSetup;
  history: ScopedHistory;
  spacesApiUi?: SpacesApiUi;
}

function useRunAsUsers(
  userAPIClient: PublicMethodsOf<UserAPIClient>,
  fatalErrors: FatalErrorsSetup
) {
  const [userNames, setUserNames] = useState<string[] | null>(null);
  useEffect(() => {
    userAPIClient.getUsers().then(
      (users) => setUserNames(users.map((user) => user.username)),
      (err) => fatalErrors.add(err)
    );
  }, [fatalErrors, userAPIClient]);

  return userNames;
}

function useIndexPatternsTitles(
  indexPatterns: IndexPatternsContract,
  fatalErrors: FatalErrorsSetup,
  notifications: NotificationsStart
) {
  const [indexPatternsTitles, setIndexPatternsTitles] = useState<string[] | null>(null);
  useEffect(() => {
    indexPatterns
      .getTitles()
      .catch((err: IHttpFetchError) => {
        // If user doesn't have access to the index patterns they still should be able to create new
        // or edit existing role.
        if (err.response?.status === 403) {
          notifications.toasts.addDanger({
            title: i18n.translate('xpack.security.management.roles.noIndexPatternsPermission', {
              defaultMessage: 'You need permission to access the list of available index patterns.',
            }),
          });
          return [];
        }

        fatalErrors.add(err);
        throw err;
      })
      .then((titles) => setIndexPatternsTitles(titles.filter(Boolean)));
  }, [fatalErrors, indexPatterns, notifications]);

  return indexPatternsTitles;
}

function usePrivileges(
  privilegesAPIClient: PublicMethodsOf<PrivilegesAPIClient>,
  fatalErrors: FatalErrorsSetup
) {
  const [privileges, setPrivileges] = useState<[RawKibanaPrivileges, BuiltinESPrivileges] | null>(
    null
  );
  useEffect(() => {
    Promise.all([
      privilegesAPIClient.getAll({ includeActions: true }),
      privilegesAPIClient.getBuiltIn(),
    ]).then(
      ([kibanaPrivileges, builtInESPrivileges]) =>
        setPrivileges([kibanaPrivileges, builtInESPrivileges]),
      (err) => fatalErrors.add(err)
    );
  }, [privilegesAPIClient, fatalErrors]);

  return privileges;
}

function useRole(
  rolesAPIClient: PublicMethodsOf<RolesAPIClient>,
  fatalErrors: FatalErrorsSetup,
  notifications: NotificationsStart,
  license: SecurityLicense,
  action: string,
  backToRoleList: () => void,
  roleName?: string
) {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    const rolePromise = roleName
      ? rolesAPIClient.getRole(roleName)
      : Promise.resolve({
          name: '',
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [],
          _unrecognized_applications: [],
        } as Role);

    rolePromise
      .then((fetchedRole) => {
        if (action === 'clone' && checkIfRoleReserved(fetchedRole)) {
          backToRoleList();
          return;
        }

        if (fetchedRole.elasticsearch.indices.length === 0) {
          const emptyOption: RoleIndexPrivilege = {
            names: [],
            privileges: [],
          };

          const { allowRoleDocumentLevelSecurity, allowRoleFieldLevelSecurity } =
            license.getFeatures();

          if (allowRoleFieldLevelSecurity) {
            emptyOption.field_security = {
              grant: ['*'],
              except: [],
            };
          }

          if (allowRoleDocumentLevelSecurity) {
            emptyOption.query = '';
          }

          fetchedRole.elasticsearch.indices.push(emptyOption);
        }

        setRole(action === 'clone' ? prepareRoleClone(fetchedRole) : copyRole(fetchedRole));
      })
      .catch((err: IHttpFetchError) => {
        if (err.response?.status === 404) {
          notifications.toasts.addDanger({
            title: i18n.translate('xpack.security.management.roles.roleNotFound', {
              defaultMessage: 'No "{roleName}" role found.',
              values: { roleName },
            }),
          });
          backToRoleList();
        } else {
          fatalErrors.add(err);
        }
      });
  }, [roleName, action, fatalErrors, rolesAPIClient, notifications, license, backToRoleList]);

  return [role, setRole] as [Role | null, typeof setRole];
}

function useSpaces(http: HttpStart, fatalErrors: FatalErrorsSetup) {
  const [spaces, setSpaces] = useState<{ enabled: boolean; list: Space[] } | null>(null);
  useEffect(() => {
    http.get('/api/spaces/space').then(
      (fetchedSpaces) => setSpaces({ enabled: true, list: fetchedSpaces }),
      (err: IHttpFetchError) => {
        // Spaces plugin can be disabled and hence this endpoint can be unavailable.
        if (err.response?.status === 404) {
          setSpaces({ enabled: false, list: [] });
        } else {
          fatalErrors.add(err);
        }
      }
    );
  }, [http, fatalErrors]);

  return spaces;
}

function useFeatures(
  getFeatures: FeaturesPluginStart['getFeatures'],
  fatalErrors: FatalErrorsSetup
) {
  const [features, setFeatures] = useState<KibanaFeature[] | null>(null);
  useEffect(() => {
    getFeatures()
      .catch((err: IHttpFetchError) => {
        // Currently, the `/api/features` endpoint effectively requires the "Global All" kibana privilege (e.g., what
        // the `kibana_user` grants), because it returns information about all registered features (#35841). It's
        // possible that a user with `manage_security` will attempt to visit the role management page without the
        // correct Kibana privileges. If that's the case, then they receive a partial view of the role, and the UI does
        // not allow them to make changes to that role's kibana privileges. When this user visits the edit role page,
        // this API endpoint will throw a 403, which causes view to fail completely. So we instead attempt to detect the
        // 403 here, and respond in a way that still allows the UI to render itself.
        const unauthorizedForFeatures = err.response?.status === 403;
        if (unauthorizedForFeatures) {
          return [] as KibanaFeature[];
        }
        fatalErrors.add(err);
      })
      .then((retrievedFeatures) => {
        setFeatures(retrievedFeatures);
      });
  }, [fatalErrors, getFeatures]);

  return features;
}

export const EditRolePage: FunctionComponent<Props> = ({
  userAPIClient,
  indexPatterns,
  rolesAPIClient,
  indicesAPIClient,
  privilegesAPIClient,
  getFeatures,
  http,
  roleName,
  action,
  fatalErrors,
  license,
  docLinks,
  uiCapabilities,
  notifications,
  history,
  spacesApiUi,
}) => {
  if (!indexPatterns) {
    // The indexPatterns plugin is technically marked as an optional dependency because we don't need to pull it in for Anonymous pages (such
    // as the login page). That said, it _is_ required for this page to function correctly, so we throw an error here if it's not available.
    // We don't ever expect Kibana to work correctly if the indexPatterns plugin is not available (and we don't expect this to happen at all),
    // so this error edge case is an acceptable tradeoff.
    throw new Error('The indexPatterns plugin is required for this page, but it is not available');
  }
  const backToRoleList = useCallback(() => history.push('/'), [history]);

  // We should keep the same mutable instance of Validator for every re-render since we'll
  // eventually enable validation after the first time user tries to save a role.
  const { current: validator } = useRef(new RoleValidator({ shouldValidate: false }));
  const [formError, setFormError] = useState<RoleValidationResult | null>(null);
  const runAsUsers = useRunAsUsers(userAPIClient, fatalErrors);
  const indexPatternsTitles = useIndexPatternsTitles(indexPatterns, fatalErrors, notifications);
  const privileges = usePrivileges(privilegesAPIClient, fatalErrors);
  const spaces = useSpaces(http, fatalErrors);
  const features = useFeatures(getFeatures, fatalErrors);
  const [role, setRole] = useRole(
    rolesAPIClient,
    fatalErrors,
    notifications,
    license,
    action,
    backToRoleList,
    roleName
  );

  if (!role || !runAsUsers || !indexPatternsTitles || !privileges || !spaces || !features) {
    return null;
  }

  const isEditingExistingRole = !!roleName && action === 'edit';
  const isRoleReadOnly = checkIfRoleReadOnly(role);
  const isRoleReserved = checkIfRoleReserved(role);
  const isDeprecatedRole = checkIfRoleDeprecated(role);

  const [kibanaPrivileges, builtInESPrivileges] = privileges;

  const getFormTitle = () => {
    let titleText;
    const props: HTMLProps<HTMLDivElement> = {
      tabIndex: 0,
    };
    if (isRoleReserved) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.viewingRoleTitle"
          defaultMessage="Viewing role"
        />
      );
      props['aria-describedby'] = 'reservedRoleDescription';
    } else if (isEditingExistingRole) {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.editRoleTitle"
          defaultMessage="Edit role"
        />
      );
    } else {
      titleText = (
        <FormattedMessage
          id="xpack.security.management.editRole.createRoleTitle"
          defaultMessage="Create role"
        />
      );
    }

    return (
      <EuiTitle size="l">
        <h1 {...props}>
          {titleText} <ReservedRoleBadge role={role} />
        </h1>
      </EuiTitle>
    );
  };

  const getActionButton = () => {
    if (isEditingExistingRole && !isRoleReadOnly) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteRoleButton canDelete={true} onDelete={handleDeleteRole} />
        </EuiFlexItem>
      );
    }

    return null;
  };

  const getRoleName = () => {
    return (
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiFormRow
          label={
            <FormattedMessage
              id="xpack.security.management.editRole.roleNameFormRowTitle"
              defaultMessage="Role name"
            />
          }
          helpText={
            !isRoleReserved && isEditingExistingRole ? (
              <FormattedMessage
                id="xpack.security.management.editRole.roleNameFormRowHelpText"
                defaultMessage="A role's name cannot be changed once it has been created."
              />
            ) : undefined
          }
          {...validator.validateRoleName(role)}
        >
          <EuiFieldText
            name={'name'}
            value={role.name || ''}
            onChange={onNameChange}
            data-test-subj={'roleFormNameInput'}
            readOnly={isRoleReserved || isEditingExistingRole}
          />
        </EuiFormRow>
      </EuiPanel>
    );
  };

  const onNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setRole({
      ...role,
      name: e.target.value,
    });

  const getElasticsearchPrivileges = () => {
    return (
      <div>
        <EuiSpacer />
        <ElasticsearchPrivileges
          role={role}
          editable={!isRoleReadOnly}
          indicesAPIClient={indicesAPIClient}
          onChange={onRoleChange}
          runAsUsers={runAsUsers}
          validator={validator}
          indexPatterns={indexPatternsTitles}
          builtinESPrivileges={builtInESPrivileges}
          license={license}
          docLinks={docLinks}
        />
      </div>
    );
  };

  const onRoleChange = (newRole: Role) => setRole(newRole);

  const getKibanaPrivileges = () => {
    return (
      <div>
        <EuiSpacer />
        <KibanaPrivilegesRegion
          kibanaPrivileges={new KibanaPrivileges(kibanaPrivileges, features)}
          spaces={spaces.list}
          spacesEnabled={spaces.enabled}
          uiCapabilities={uiCapabilities}
          canCustomizeSubFeaturePrivileges={license.getFeatures().allowSubFeaturePrivileges}
          editable={!isRoleReadOnly}
          role={role}
          onChange={onRoleChange}
          validator={validator}
          spacesApiUi={spacesApiUi}
        />
      </div>
    );
  };

  const getFormButtons = () => {
    if (isRoleReadOnly) {
      return getReturnToRoleListButton();
    }

    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>{getSaveButton()}</EuiFlexItem>
        <EuiFlexItem grow={false}>{getCancelButton()}</EuiFlexItem>
        <EuiFlexItem grow={true} />
        {getActionButton()}
      </EuiFlexGroup>
    );
  };

  const getReturnToRoleListButton = () => {
    return (
      <EuiButton {...reactRouterNavigate(history, '')} data-test-subj="roleFormReturnButton">
        <FormattedMessage
          id="xpack.security.management.editRole.returnToRoleListButtonLabel"
          defaultMessage="Return to role list"
        />
      </EuiButton>
    );
  };

  const getSaveButton = () => {
    const saveText = isEditingExistingRole ? (
      <FormattedMessage
        id="xpack.security.management.editRole.updateRoleText"
        defaultMessage="Update role"
      />
    ) : (
      <FormattedMessage
        id="xpack.security.management.editRole.createRoleText"
        defaultMessage="Create role"
      />
    );

    return (
      <EuiButton
        data-test-subj={`roleFormSaveButton`}
        fill
        onClick={saveRole}
        disabled={isRoleReserved}
      >
        {saveText}
      </EuiButton>
    );
  };

  const getCancelButton = () => {
    return (
      <EuiButtonEmpty data-test-subj={`roleFormCancelButton`} onClick={backToRoleList}>
        <FormattedMessage
          id="xpack.security.management.editRole.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      </EuiButtonEmpty>
    );
  };

  const saveRole = async () => {
    validator.enableValidation();

    const result = validator.validateForSave(role);
    if (result.isInvalid) {
      setFormError(result);
    } else {
      setFormError(null);

      try {
        await rolesAPIClient.saveRole({ role, spacesEnabled: spaces.enabled });
      } catch (error) {
        notifications.toasts.addDanger(
          error?.body?.message ??
            i18n.translate('xpack.security.management.editRole.errorSavingRoleError', {
              defaultMessage: 'Error saving role',
            })
        );
        return;
      }

      notifications.toasts.addSuccess(
        i18n.translate(
          'xpack.security.management.editRole.roleSuccessfullySavedNotificationMessage',
          { defaultMessage: 'Saved role' }
        )
      );

      backToRoleList();
    }
  };

  const handleDeleteRole = async () => {
    try {
      await rolesAPIClient.deleteRole(role.name);
    } catch (error) {
      notifications.toasts.addDanger(
        error?.data?.message ??
          i18n.translate('xpack.security.management.editRole.errorDeletingRoleError', {
            defaultMessage: 'Error deleting role',
          })
      );
      return;
    }

    notifications.toasts.addSuccess(
      i18n.translate(
        'xpack.security.management.editRole.roleSuccessfullyDeletedNotificationMessage',
        { defaultMessage: 'Deleted role' }
      )
    );

    backToRoleList();
  };

  const description = spaces.enabled ? (
    <FormattedMessage
      id="xpack.security.management.editRole.setPrivilegesToKibanaSpacesDescription"
      defaultMessage="Set privileges on your Elasticsearch data and control access to your Kibana spaces."
    />
  ) : (
    <FormattedMessage
      id="xpack.security.management.editRole.setPrivilegesToKibanaDescription"
      defaultMessage="Set privileges on your Elasticsearch data and control access to Kibana."
    />
  );

  return (
    <div className="editRolePage">
      <EuiForm {...formError}>
        {getFormTitle()}
        <EuiSpacer />
        <EuiText size="s">{description}</EuiText>
        {isRoleReserved && (
          <Fragment>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p id="reservedRoleDescription" tabIndex={0}>
                <FormattedMessage
                  id="xpack.security.management.editRole.modifyingReversedRolesDescription"
                  defaultMessage="Reserved roles are built-in and cannot be removed or modified."
                />
              </p>
            </EuiText>
          </Fragment>
        )}
        {isDeprecatedRole && (
          <Fragment>
            <EuiSpacer size="s" />
            <EuiCallOut
              title={getExtendedRoleDeprecationNotice(role)}
              color="warning"
              iconType="alert"
            />
          </Fragment>
        )}
        <EuiSpacer />
        {getRoleName()}
        {getElasticsearchPrivileges()}
        {getKibanaPrivileges()}
        <EuiSpacer />
        {getFormButtons()}
      </EuiForm>
    </div>
  );
};
