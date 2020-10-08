/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIconTip } from '@elastic/eui';
import { SecuredFeature, SubFeaturePrivilegeGroup, SubFeaturePrivilege } from '../../../../model';
import { EffectiveFeaturePrivileges } from './privilege_summary_calculator';

interface Props {
  feature: SecuredFeature;
  effectiveFeaturePrivileges: Array<EffectiveFeaturePrivileges['featureId']>;
}

export const PrivilegeSummaryExpandedRow = (props: Props) => {
  return (
    <EuiFlexGroup direction="column">
      {props.feature.getSubFeatures().map((subFeature) => {
        return (
          <EuiFlexItem key={subFeature.name} data-test-subj="subFeatureEntry">
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s" data-test-subj="subFeatureName">
                  {subFeature.name}
                </EuiText>
              </EuiFlexItem>
              {props.effectiveFeaturePrivileges.map((privs, index) => {
                return (
                  <EuiFlexItem key={index} data-test-subj={`entry-${index}`}>
                    {subFeature.getPrivilegeGroups().map(renderPrivilegeGroup(privs.subFeature))}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  function renderPrivilegeGroup(effectiveSubFeaturePrivileges: string[]) {
    return (privilegeGroup: SubFeaturePrivilegeGroup, index: number) => {
      switch (privilegeGroup.groupType) {
        case 'independent':
          return renderIndependentPrivilegeGroup(
            effectiveSubFeaturePrivileges,
            privilegeGroup,
            index
          );
        case 'mutually_exclusive':
          return renderMutuallyExclusivePrivilegeGroup(
            effectiveSubFeaturePrivileges,
            privilegeGroup,
            index
          );
        default:
          throw new Error(`Unsupported privilege group type: ${privilegeGroup.groupType}`);
      }
    };
  }

  function renderIndependentPrivilegeGroup(
    effectiveSubFeaturePrivileges: string[],
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    return (
      <div key={index}>
        {privilegeGroup.privileges.map((privilege: SubFeaturePrivilege) => {
          const isGranted = effectiveSubFeaturePrivileges.includes(privilege.id);
          return (
            <EuiFlexGroup gutterSize="s" data-test-subj="independentPrivilege" key={privilege.id}>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  type={isGranted ? 'check' : 'cross'}
                  color={isGranted ? 'primary' : 'danger'}
                  content={
                    isGranted
                      ? i18n.translate(
                          'xpack.security.management.editRole.privilegeSummary.privilegeGrantedIconTip',
                          { defaultMessage: 'Privilege is granted' }
                        )
                      : i18n.translate(
                          'xpack.security.management.editRole.privilegeSummary.privilegeNotGrantedIconTip',
                          { defaultMessage: 'Privilege is not granted' }
                        )
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" data-test-subj="privilegeName">
                  {privilege.name}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </div>
    );
  }

  function renderMutuallyExclusivePrivilegeGroup(
    effectiveSubFeaturePrivileges: string[],
    privilegeGroup: SubFeaturePrivilegeGroup,
    index: number
  ) {
    const firstSelectedPrivilege = privilegeGroup.privileges.find((p) =>
      effectiveSubFeaturePrivileges.includes(p.id)
    )?.name;

    return (
      <EuiFlexGroup gutterSize="s" key={index} data-test-subj="mutexPrivilege">
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={firstSelectedPrivilege ? 'check' : 'cross'}
            color={firstSelectedPrivilege ? 'primary' : 'danger'}
            content={firstSelectedPrivilege ? 'Privilege is granted' : 'Privilege is not granted'}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" data-test-subj="privilegeName">
            {firstSelectedPrivilege ?? 'None'}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};
