/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCheckbox, EuiButtonGroup } from '@elastic/eui';

import { NO_PRIVILEGE_VALUE } from '../constants';
import { PrivilegeFormCalculator } from '../privilege_form_calculator';
import {
  SecuredSubFeature,
  SubFeaturePrivilegeGroup,
  SubFeaturePrivilege,
} from '../../../../model';

interface Props {
  featureId: string;
  subFeature: SecuredSubFeature;
  selectedFeaturePrivileges: string[];
  privilegeCalculator: PrivilegeFormCalculator;
  privilegeIndex: number;
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
          const isGranted = props.privilegeCalculator.isIndependentSubFeaturePrivilegeGranted(
            props.featureId,
            privilege.id,
            props.privilegeIndex
          );
          return (
            <EuiCheckbox
              key={privilege.id}
              id={`${props.featureId}_${privilege.id}`}
              label={privilege.name}
              data-test-subj="independentSubFeaturePrivilegeControl"
              onChange={(e) => {
                const { checked } = e.target;
                if (checked) {
                  props.onChange([...props.selectedFeaturePrivileges, privilege.id]);
                } else {
                  props.onChange(
                    props.selectedFeaturePrivileges.filter((sp) => sp !== privilege.id)
                  );
                }
              }}
              checked={isGranted}
              disabled={props.disabled}
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
    const firstSelectedPrivilege = props.privilegeCalculator.getSelectedMutuallyExclusiveSubFeaturePrivilege(
      props.featureId,
      privilegeGroup,
      props.privilegeIndex
    );

    const options = [
      ...privilegeGroup.privileges.map((privilege, privilegeIndex) => {
        return {
          id: privilege.id,
          label: privilege.name,
          isDisabled: props.disabled,
        };
      }),
    ];

    options.push({
      id: NO_PRIVILEGE_VALUE,
      label: 'None',
      isDisabled: props.disabled,
    });

    return (
      <EuiButtonGroup
        key={index}
        buttonSize="compressed"
        data-test-subj="mutexSubFeaturePrivilegeControl"
        options={options}
        idSelected={firstSelectedPrivilege?.id ?? NO_PRIVILEGE_VALUE}
        isDisabled={props.disabled}
        onChange={(selectedPrivilegeId) => {
          // Deselect all privileges which belong to this mutually-exclusive group
          const privilegesWithoutGroupEntries = props.selectedFeaturePrivileges.filter(
            (sp) => !privilegeGroup.privileges.some((privilege) => privilege.id === sp)
          );
          // fire on-change with the newly selected privilege
          if (selectedPrivilegeId === NO_PRIVILEGE_VALUE) {
            props.onChange(privilegesWithoutGroupEntries);
          } else {
            props.onChange([...privilegesWithoutGroupEntries, selectedPrivilegeId]);
          }
        }}
      />
    );
  }
};
