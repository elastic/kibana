/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCheckbox } from '@elastic/eui';
import {
  SubFeaturePrivilegeGroup,
  SubFeaturePrivilege,
  SecuredFeature,
} from '../../../../../../../common/model';

interface Props {
  feature: SecuredFeature;
  effectiveSubFeaturePrivileges: string[][];
}

export const PrivilegeSummaryExpandedRow = (props: Props) => {
  if (!props.feature.subFeatures || props.feature.subFeatures.length === 0) {
    return (
      <EuiText size="s" data-test-subj="noSubFeatures">
        Customizations are not available for this feature.
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      {props.feature.subFeatures.map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">{subFeature.name}</EuiText>
              </EuiFlexItem>
              {props.effectiveSubFeaturePrivileges.map(privs => {
                return (
                  <EuiFlexItem>
                    {subFeature.getPrivilegeGroups().map(renderPrivilegeGroup(privs))}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  function renderPrivilegeGroup(effectivePrivileges: string[]) {
    return (privilegeGroup: SubFeaturePrivilegeGroup, index: number) => {
      switch (privilegeGroup.groupType) {
        case 'independent':
          return renderIndependentPrivilegeGroup(effectivePrivileges, privilegeGroup, index);
        case 'mutually_exclusive':
          return renderMutuallyExclusivePrivilegeGroup(effectivePrivileges, privilegeGroup, index);
        default:
          throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
      }
    };
  }

  function renderIndependentPrivilegeGroup(
    effectivePrivileges: string[],
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    return (
      <div key={index}>
        {privilegeGroup.privileges.map((privilege: SubFeaturePrivilege) => {
          const isGranted = effectivePrivileges.includes(privilege.id);
          return (
            <EuiCheckbox
              key={privilege.id}
              id={privilege.id}
              label={privilege.name}
              data-test-subj="independentSubFeaturePrivilegeControl"
              onChange={() => {}}
              checked={isGranted}
              disabled={true}
              compressed={true}
            />
          );
        })}
      </div>
    );
  }

  function renderMutuallyExclusivePrivilegeGroup(
    effectivePrivileges: string[],
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    const firstSelectedPrivilege = privilegeGroup.privileges.find(p =>
      effectivePrivileges.includes(p.id)
    );

    return <EuiText size="s">{firstSelectedPrivilege?.name ?? 'NO SOUP!!!'}</EuiText>;
  }
};
