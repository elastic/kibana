/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent, EuiText } from '@elastic/eui';
import {
  Role,
  SecuredFeature,
  PrimaryFeaturePrivilege,
  SubFeaturePrivilege,
} from '../../../../../../../common/model';
import { SubFeatureForm } from './sub_feature_form';
import { POCPrivilegeCalculator } from '../poc_privilege_calculator';

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
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [canCustomize, setCanCustomize] = useState(false);
  const [hasInheritedCustomizations, setHasInheritedCustomizations] = useState(false);

  const selectedPrivileges = role.kibana[spacesIndex].feature[feature.id] ?? [];

  const selectedPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[] = feature.primaryFeaturePrivileges.filter(
    pfp => selectedPrivileges.includes(pfp.id)
  );

  const selectedMinimalPrimaryFeaturePrivileges: PrimaryFeaturePrivilege[] = feature.minimalPrimaryFeaturePrivileges.filter(
    mpfp => selectedPrivileges.includes(mpfp.id)
  );

  const privilegeExplanations = privilegeCalculator.explainEffectiveFeaturePrivileges(
    role,
    spacesIndex,
    feature.id
  );

  useEffect(() => {
    const hasEffectivePrimaryFeaturePrivilege = privilegeExplanations.exists(
      (featureId, privilegeId, explanation) =>
        explanation.isGranted() &&
        explanation.privilege.privilege instanceof PrimaryFeaturePrivilege
    );

    const hasEffectiveBasePrivilege = !!privilegeCalculator.getEffectiveBasePrivilege(
      role,
      spacesIndex
    );

    const hasEffectiveNonMinimalPrimaryFeaturePrivilege = privilegeExplanations.exists(
      (featureId, privilegeId, explanation) =>
        explanation.isGranted() &&
        explanation.privilege.privilege instanceof PrimaryFeaturePrivilege &&
        !explanation.privilege.privilege.isMinimalFeaturePrivilege()
    );
    const hasEffectiveMinimalPrimaryFeaturePrivilege = privilegeExplanations.exists(
      (featureId, privilegeId, explanation) =>
        explanation.isGranted() &&
        explanation.privilege.privilege instanceof PrimaryFeaturePrivilege &&
        explanation.privilege.privilege.isMinimalFeaturePrivilege()
    );

    console.log({ disabled, hasEffectiveBasePrivilege, hasEffectivePrimaryFeaturePrivilege });

    setCanCustomize(
      !Boolean(disabled) && !hasEffectiveBasePrivilege && hasEffectivePrimaryFeaturePrivilege
    );

    setHasInheritedCustomizations(
      privilegeExplanations.exists((featureId, privilegeId, explanation) => {
        return (
          explanation.privilege.privilege instanceof SubFeaturePrivilege &&
          explanation
            .getGrantSources()
            .global.some(source => source.isParentScopeOf(explanation.privilege))
        );
      })
    );

    setIsCustomizing(
      (hasEffectiveMinimalPrimaryFeaturePrivilege &&
        !hasEffectiveNonMinimalPrimaryFeaturePrivilege) ||
        privilegeExplanations.hasNonSupersededSubFeatureCustomizations()
    );
  }, [
    disabled,
    hasInheritedCustomizations,
    isCustomizing,
    privilegeCalculator,
    privilegeExplanations,
    role,
    role.kibana,
    selectedMinimalPrimaryFeaturePrivileges.length,
    spacesIndex,
  ]);

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

      let updatedSelectedPrivileges = [...selectedPrivileges];
      if (selectedPrimaryFeaturePrivilege) {
        updatedSelectedPrivileges = selectedPrivileges.filter(
          sp => sp !== selectedPrimaryFeaturePrivilege.id
        );
        updatedSelectedPrivileges.push(
          getMinimumFeaturePrivilege(selectedPrimaryFeaturePrivilege.id)
        );
      }
      setIsCustomizing(customizeSubFeatures);
      onChange(feature.id, updatedSelectedPrivileges);
    } else {
      const selectedMinimalPrimaryFeaturePrivilege = selectedMinimalPrimaryFeaturePrivileges[0];

      const updatedSelectedPrivileges = [];
      if (selectedMinimalPrimaryFeaturePrivilege) {
        updatedSelectedPrivileges.push(
          getRegularFeaturePrivilege(selectedMinimalPrimaryFeaturePrivilege.id)
        );
      }

      setIsCustomizing(customizeSubFeatures);
      onChange(feature.id, updatedSelectedPrivileges);
    }
  };

  if (!feature.subFeatures || feature.subFeatures.length === 0) {
    return (
      <EuiText size="s" data-test-subj="noSubFeatures">
        Customizations are not available for this feature.
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          label="Customize sub-feature privileges"
          checked={isCustomizing}
          onChange={onCustomizeSubFeatureChange}
          disabled={!canCustomize}
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
              disabled={disabled || !isCustomizing}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
