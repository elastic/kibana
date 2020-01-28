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

import { NO_PRIVILEGE_VALUE } from '../constants';
import { ScopedPrivilegeCalculator } from '../privilege_calculator';

interface Props {
  featureId: string;
  subFeature: SecuredSubFeature;
  selectedFeaturePrivileges: string[];
  privilegeCalculator: ScopedPrivilegeCalculator;
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
          const { selected, inherited } = props.privilegeCalculator.describeFeaturePrivilege(
            props.featureId,
            privilege.id
          );

          return (
            <EuiCheckbox
              key={privilege.id}
              id={privilege.id}
              label={privilege.name}
              data-test-subj="independentSubFeaturePrivilegeControl"
              onChange={e => {
                const { checked } = e.target;
                if (checked) {
                  props.onChange([...props.selectedFeaturePrivileges, privilege.id]);
                } else {
                  props.onChange(props.selectedFeaturePrivileges.filter(sp => sp !== privilege.id));
                }
              }}
              checked={selected}
              disabled={inherited || props.disabled}
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
    const calcResult = props.privilegeCalculator.describeMutuallyExclusiveSubFeaturePrivileges(
      privilegeGroup
    );

    const firstSelectedPrivilege = privilegeGroup.privileges.find(
      p => props.privilegeCalculator.describeFeaturePrivilege(props.featureId, p.id).selected
    );

    const options = [
      ...privilegeGroup.privileges.map((privilege, privilegeIndex) => {
        return {
          id: privilege.id,
          label: privilege.name,
          isDisabled: props.disabled || !calcResult[privilege.id].enabled,
        };
      }),
    ];

    options.push({
      id: NO_PRIVILEGE_VALUE,
      label: 'None',
      isDisabled: props.disabled || Object.values(calcResult).some(r => r.inherited),
    });

    return (
      <EuiButtonGroup
        key={index}
        buttonSize="compressed"
        data-test-subj="mutexSubFeaturePrivilegeControl"
        options={options}
        idSelected={firstSelectedPrivilege?.id ?? NO_PRIVILEGE_VALUE}
        isDisabled={props.disabled}
        onChange={selectedPrivilegeId => {
          // Deselect all privileges which belong to this mutually-exclusive group
          const privilegesWithoutGroupEntries = props.selectedFeaturePrivileges.filter(
            sp => !privilegeGroup.privileges.some(privilege => privilege.id === sp)
          );
          // fire on-change with the newly selected privilege
          props.onChange([...privilegesWithoutGroupEntries, selectedPrivilegeId]);
        }}
      />
    );
  }
};
