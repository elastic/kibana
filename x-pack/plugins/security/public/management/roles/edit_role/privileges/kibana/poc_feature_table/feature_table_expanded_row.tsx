/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { POCPrivilegeCalculator } from 'plugins/security/lib/poc_privilege_calculator/poc_privilege_calculator';
import { Role, SecuredFeature, PrimaryFeaturePrivilege } from '../../../../../../../common/model';
import { SubFeatureForm } from './sub_feature_form';
import { isGlobalPrivilegeDefinition } from '../../../privilege_utils';

interface Props {
  feature: SecuredFeature;
  role: Role;
  spacesIndex: number;
  privilegeCalculator: POCPrivilegeCalculator;
  disabled?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

export const FeatureTableExpandedRow = ({
  feature,
  role,
  spacesIndex,
  onChange,
  privilegeCalculator,
  disabled,
}: Props) => {
  const selectedPrivileges = role.kibana[spacesIndex].feature[feature.id] ?? [];

  const selectedPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[] = feature.primaryFeaturePrivileges.filter(
    pfp => selectedPrivileges.includes(pfp.id)
  );

  const selectedMinimalPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[] = feature.minimalPrimaryFeaturePrivileges.filter(
    mpfp => selectedPrivileges.includes(mpfp.id)
  );

  const subFeaturePrivileges: string[] = [];
  for (const sfp of feature.subFeaturePrivilegeIterator()) {
    subFeaturePrivileges.push(sfp.id);
  }

  const privilegeExplanations = privilegeCalculator.explainEffectiveFeaturePrivileges(
    role,
    spacesIndex,
    feature.id
  );

  // TODO: externalize
  const isMinimumFeaturePrivilege = (privilege: string) => privilege.startsWith('minimal_');
  const getMinimumFeaturePrivilege = (privilege: string) =>
    isMinimumFeaturePrivilege(privilege) ? privilege : `minimal_${privilege}`;

  const getRegularFeaturePrivilege = (privilege: string) =>
    isMinimumFeaturePrivilege(privilege) ? privilege.substr(`minimal_`.length) : privilege;

  // TODO: ugly change logic
  const onCustomizeSubFeatureChange = (e: EuiSwitchEvent) => {
    const customizeSubFeatures = e.target.checked;

    if (customizeSubFeatures) {
      const selectedPrimaryFeaturePrivilege = selectedPrimaryFeaturePrivileges[0];

      if (!selectedPrimaryFeaturePrivilege) {
        return;
      }

      const updatedSelectedPrivileges = selectedPrivileges.filter(
        sp => sp !== selectedPrimaryFeaturePrivilege.id
      );
      updatedSelectedPrivileges.push(
        getMinimumFeaturePrivilege(selectedPrimaryFeaturePrivilege.id)
      );

      onChange(feature.id, updatedSelectedPrivileges);
    } else {
      const selectedMinimalPrimaryFeaturePrivilege = selectedMinimalPrimaryFeaturePrivileges[0];

      if (!selectedMinimalPrimaryFeaturePrivilege) {
        return;
      }

      const updatedSelectedPrivileges = [
        getRegularFeaturePrivilege(selectedMinimalPrimaryFeaturePrivilege.id),
      ];

      onChange(feature.id, updatedSelectedPrivileges);
    }
  };

  const canCustomize =
    !disabled &&
    privilegeExplanations.exists((featureId, privilegeId, explanation) => {
      return (
        !explanation.isGranted() ||
        !explanation.getGrantSources().global.some(source => source.type === 'base') ||
        !explanation.getGrantSources().space.some(source => source.type === 'base')
      );
    });

  const hasInheritedCustomizations =
    !isGlobalPrivilegeDefinition(role.kibana[spacesIndex]) &&
    privilegeExplanations.exists((featureId, privilegeId, explanation) => {
      return explanation
        .getGrantSources()
        .global.some(source => subFeaturePrivileges.includes(privilegeId));
    });

  const isCustomizingSubFeaturePrivileges =
    selectedMinimalPrimaryFeaturePrivileges.length > 0 || hasInheritedCustomizations;

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          label="Customize sub-feature privileges"
          checked={isCustomizingSubFeaturePrivileges}
          onChange={onCustomizeSubFeatureChange}
          disabled={!canCustomize || hasInheritedCustomizations}
        />
      </EuiFlexItem>
      {feature.subFeatures.map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
              featureId={feature.id}
              subFeature={subFeature}
              onChange={updatedPrivileges => onChange(feature.id, updatedPrivileges)}
              selectedPrivileges={selectedPrivileges}
              privilegeExplanations={privilegeExplanations}
              disabled={disabled}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
