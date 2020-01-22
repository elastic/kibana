/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCheckbox, EuiButtonGroup } from '@elastic/eui';
import {
  SecuredSubFeature,
  SubFeaturePrivilegeGroup,
  SubFeaturePrivilege,
} from '../../../../../../../common/model';
import { FeaturePrivilegesExplanations } from '../../../../../../../common/model/poc_kibana_privileges/feature_privileges_explanations';

import { NO_PRIVILEGE_VALUE } from '../constants';

interface Props {
  featureId: string;
  subFeature: SecuredSubFeature;
  selectedPrivileges: string[];
  privilegeExplanations: FeaturePrivilegesExplanations;
  onChange: (selectedPrivileges: string[]) => void;
  disabled?: boolean;
}

export const SubFeatureForm = (props: Props) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiText size="s">{props.subFeature.name}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{props.subFeature.getPrivilegeGroups().map(renderPrivilegeGroup)}</EuiFlexItem>
    </EuiFlexGroup>
  );

  function renderPrivilegeGroup(privilegeGroup: SubFeaturePrivilegeGroup, index: number) {
    switch (privilegeGroup.groupType) {
      case 'independent':
        return renderIndependentPrivilegeGroup(privilegeGroup, index);
      case 'mutually_exclusive':
        return renderMutuallyExclusivePrivilegeGroup(privilegeGroup, index);
      default:
        throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
    }
  }

  function renderIndependentPrivilegeGroup(
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    return (
      <div key={index}>
        {privilegeGroup.privileges.map((privilege: SubFeaturePrivilege) => {
          const isSelected = props.privilegeExplanations.isGranted(props.featureId, privilege.id);
          const isInherited = props.privilegeExplanations.isInherited(
            props.featureId,
            privilege.id
          );
          return (
            <EuiCheckbox
              key={privilege.id}
              id={privilege.id}
              label={privilege.name}
              onChange={e => {
                const { checked } = e.target;
                if (checked) {
                  props.onChange([...props.selectedPrivileges, privilege.id]);
                } else {
                  props.onChange(props.selectedPrivileges.filter(sp => sp !== privilege.id));
                }
              }}
              checked={isSelected}
              disabled={isInherited || props.disabled}
              compressed={true}
            />
          );
        })}
      </div>
    );
  }

  function renderMutuallyExclusivePrivilegeGroup(
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    const firstSelectedPrivilege = privilegeGroup.privileges.find(p =>
      props.privilegeExplanations.isGranted(props.featureId, p.id)
    );
    const isInherited =
      firstSelectedPrivilege &&
      props.privilegeExplanations.isInherited(props.featureId, firstSelectedPrivilege.id);

    const areAnyInherited = props.privilegeExplanations.exists(
      (featureId, privilegeId, explanation) =>
        privilegeGroup.privileges.some(
          pgp => explanation.isInherited() && pgp.equals(explanation.privilege)
        )
    );

    // When to disable privilege group privilege:
    // if inherited, and if a more permissive privilege in the group is NOT inherited

    const options = [
      privilegeGroup.privileges.map((privilege, privilegeIndex) => {
        return {
          id: privilege.id,
          label: privilege.name,
          isDisabled: props.privilegeExplanations.exists((featureId, privilegeId, explanation) => {
            const morePermissiveGroupPrivileges = privilegeGroup.privileges.slice(
              0,
              privilegeIndex
            );

            return morePermissiveGroupPrivileges.some(
              pgp => pgp.equals(explanation.privilege) && explanation.isInherited()
            );
          }),
        };
      }),
      {
        id: NO_PRIVILEGE_VALUE,
        label: 'None',
        isDisabled: areAnyInherited,
      },
    ].flat();

    return (
      <EuiButtonGroup
        key={index}
        buttonSize="compressed"
        options={options}
        idSelected={firstSelectedPrivilege?.id ?? NO_PRIVILEGE_VALUE}
        isDisabled={props.disabled}
        onChange={selectedPrivilegeId => {
          // Deselect all privileges which belong to this mutually-exclusive group
          const privilegesWithoutGroupEntries = props.selectedPrivileges.filter(
            sp => !privilegeGroup.privileges.some(privilege => privilege.id === sp)
          );
          // fire on-change with the newly selected privilege
          props.onChange([...privilegesWithoutGroupEntries, selectedPrivilegeId]);
        }}
      />
    );
  }
};
