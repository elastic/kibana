/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIconTip } from '@elastic/eui';
import { SecuredFeature, SubFeaturePrivilegeGroup, SubFeaturePrivilege } from '../../../../model';

interface Props {
  feature: SecuredFeature;
  effectiveSubFeaturePrivileges: string[][];
}

export const PrivilegeSummaryExpandedRow = (props: Props) => {
  return (
    <EuiFlexGroup direction="column">
      {props.feature.getSubFeatures().map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">{subFeature.name}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                {props.effectiveSubFeaturePrivileges.map((privs, index) => {
                  return (
                    <Fragment key={index}>
                      {subFeature.getPrivilegeGroups().map(renderPrivilegeGroup(privs))}
                    </Fragment>
                  );
                })}
              </EuiFlexItem>
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
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type={isGranted ? 'check' : 'cross'}
                  color={isGranted ? 'primary' : 'danger'}
                  content={isGranted ? 'Privilege is granted' : 'Privilege is not granted'}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">{privilege.name}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
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
    )?.name;

    return (
      <EuiFlexGroup gutterSize="s" key={index}>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={firstSelectedPrivilege ? 'check' : 'cross'}
            color={firstSelectedPrivilege ? 'primary' : 'danger'}
            content={firstSelectedPrivilege ? 'Privilege is granted' : 'Privilege is not granted'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{firstSelectedPrivilege ?? 'None'}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};
