/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type {
  EuiBasicTableColumn,
  EuiComboBoxOptionOption,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Role } from '@kbn/security-plugin-types-common';

import { useViewSpaceServices, type ViewSpaceServices } from './hooks/view_space_context_provider';
import type { Space } from '../../../common';
import { FeatureTable } from '../edit_space/enabled_features/feature_table';

type RolesAPIClient = ReturnType<ViewSpaceServices['getRolesAPIClient']> extends Promise<infer R>
  ? R
  : never;

interface Props {
  space: Space;
  roles: Role[];
  features: KibanaFeature[];
  isReadOnly: boolean;
}

const filterRolesAssignedToSpace = (roles: Role[], space: Space) => {
  return roles.filter((role) =>
    role.kibana.reduce((acc, cur) => {
      return (
        (cur.spaces.includes(space.name) || cur.spaces.includes('*')) &&
        Boolean(cur.base.length) &&
        acc
      );
    }, true)
  );
};

export const ViewSpaceAssignedRoles: FC<Props> = ({ space, roles, features, isReadOnly }) => {
  const [showRolesPrivilegeEditor, setShowRolesPrivilegeEditor] = useState(false);

  const rolesAPIClient = useRef<RolesAPIClient>();

  const { getRolesAPIClient } = useViewSpaceServices();

  useEffect(() => {
    async function resolveRolesAPIClient() {
      rolesAPIClient.current = await getRolesAPIClient();
    }

    if (!isReadOnly) {
      resolveRolesAPIClient();
    }
  }, [getRolesAPIClient, isReadOnly]);

  const getRowProps = (item: Role) => {
    const { name } = item;
    return {
      'data-test-subj': `space-role-row-${name}`,
      onClick: () => {},
    };
  };

  const getCellProps = (item: Role, column: EuiTableFieldDataColumnType<Role>) => {
    const { name } = item;
    const { field } = column;
    return {
      'data-test-subj': `space-role-cell-${name}-${String(field)}`,
      textOnly: true,
    };
  };

  const columns: Array<EuiBasicTableColumn<Role>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.spaces.management.spaceDetails.roles.column.name.title', {
        defaultMessage: 'Role',
      }),
    },
    {
      field: 'privileges',
      name: i18n.translate('xpack.spaces.management.spaceDetails.roles.column.privileges.title', {
        defaultMessage: 'Privileges',
      }),
      render: (_value, record) => {
        return record.kibana.map((kibanaPrivilege) => {
          return kibanaPrivilege.base.join(', ');
        });
      },
    },
  ];

  if (!isReadOnly) {
    columns.push({
      name: 'Actions',
      actions: [
        {
          name: i18n.translate(
            'xpack.spaces.management.spaceDetails.roles.column.actions.remove.title',
            {
              defaultMessage: 'Remove from space',
            }
          ),
          description: 'Click this action to remove the role privileges from this space.',
          onClick: () => {
            window.alert('Not yet implemented.');
          },
        },
      ],
    });
  }

  const rolesInUse = filterRolesAssignedToSpace(roles, space);

  if (!rolesInUse) {
    return null;
  }

  return (
    <>
      {showRolesPrivilegeEditor && (
        <PrivilegesRolesForm
          features={features}
          space={space}
          roles={roles}
          closeFlyout={() => {
            setShowRolesPrivilegeEditor(false);
          }}
          onSaveClick={() => {
            window.alert('your wish is granted');
            setShowRolesPrivilegeEditor(false);
          }}
          roleAPIClient={rolesAPIClient.current}
        />
      )}
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText>
                <p>
                  {i18n.translate('xpack.spaces.management.spaceDetails.roles.heading', {
                    defaultMessage:
                      'Roles that can access this space. Privileges are managed at the role level.',
                  })}
                </p>
              </EuiText>
            </EuiFlexItem>
            {!isReadOnly && (
              <EuiFlexItem grow={false} color="primary">
                <EuiButton
                  onClick={() => {
                    setShowRolesPrivilegeEditor(true);
                  }}
                >
                  {i18n.translate('xpack.spaces.management.spaceDetails.roles.assign', {
                    defaultMessage: 'Assign role',
                  })}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiBasicTable
            rowHeader="firstName"
            columns={columns}
            items={rolesInUse}
            rowProps={getRowProps}
            cellProps={getCellProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

interface PrivilegesRolesFormProps extends Omit<Props, 'isReadOnly'> {
  closeFlyout: () => void;
  onSaveClick: () => void;
  roleAPIClient: RolesAPIClient;
}

const createRolesComboBoxOptions = (roles: Role[]): Array<EuiComboBoxOptionOption<string>> =>
  roles.map((role) => ({
    label: role.name,
  }));

export const PrivilegesRolesForm: FC<PrivilegesRolesFormProps> = (props) => {
  const { roles, onSaveClick, closeFlyout, features, roleAPIClient } = props;

  const [space, setSpaceState] = useState(props.space);
  const [selectedRoles, setSelectedRoles] = useState(
    createRolesComboBoxOptions(filterRolesAssignedToSpace(roles, space))
  );

  const [spacePrivilege, setSpacePrivilege] = useState<'all' | 'read' | 'custom'>('all');

  const assignRolesToSpace = useCallback(() => {
    onSaveClick();
  }, [onSaveClick]);

  const getForm = () => {
    return (
      <EuiForm component="form" fullWidth>
        <EuiFormRow label="Select a role(s)">
          <EuiComboBox
            aria-label={i18n.translate('xpack.spaces.management.spaceDetails.roles.selectRoles', {
              defaultMessage: 'Select role to assign to the {spaceName} space',
              values: { spaceName: space.name },
            })}
            placeholder="Select roles"
            options={createRolesComboBoxOptions(roles)}
            selectedOptions={selectedRoles}
            onChange={(value) => {
              setSelectedRoles(value);
            }}
            isClearable={true}
            data-test-subj="roleSelectionComboBox"
            autoFocus
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          helpText={i18n.translate(
            'xpack.spaces.management.spaceDetails.roles.assign.privilegesHelpText',
            {
              defaultMessage:
                'Assign the privilege you wish to grant to all present and future features across this space',
            }
          )}
        >
          <EuiFilterGroup fullWidth>
            <EuiFilterButton
              hasActiveFilters={spacePrivilege === 'all'}
              onClick={() => setSpacePrivilege('all')}
            >
              <FormattedMessage
                id="xpack.spaces.management.spaceDetails.roles.assign.privileges.all"
                defaultMessage="All"
              />
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={spacePrivilege === 'read'}
              onClick={() => setSpacePrivilege('read')}
            >
              <FormattedMessage
                id="xpack.spaces.management.spaceDetails.roles.assign.privileges.read"
                defaultMessage="Read"
              />
            </EuiFilterButton>
            <EuiFilterButton
              hasActiveFilters={spacePrivilege === 'custom'}
              onClick={() => setSpacePrivilege('custom')}
            >
              <FormattedMessage
                id="xpack.spaces.management.spaceDetails.roles.assign.privileges.customize"
                defaultMessage="Customize"
              />
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFormRow>
        {spacePrivilege === 'custom' && (
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
              <FeatureTable space={space} features={features} onChange={setSpaceState} />
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
    <EuiFlyout onClose={closeFlyout} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Assign role to {space.name}</h2>
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
    </EuiFlyout>
  );
};
