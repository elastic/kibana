/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { SubFeatureForm } from './sub_feature_form';
import { PrivilegeFormCalculator } from '../privilege_calculator';
import { SecuredFeature, SubFeaturePrivilege, PrimaryFeaturePrivilege } from '../../../../model';

interface Props {
  feature: SecuredFeature;
  privilegeCalculator: PrivilegeFormCalculator;
  selectedFeaturePrivileges: string[];
  disabled?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

export const FeatureTableExpandedRow = ({
  feature,
  onChange,
  privilegeCalculator,
  selectedFeaturePrivileges,
  disabled,
}: Props) => {
  const [isCustomizing, setIsCustomizing] = useState(() => {
    return feature.allPrivileges
      .filter(
        ap =>
          ap instanceof SubFeaturePrivilege ||
          (ap instanceof PrimaryFeaturePrivilege && ap.isMinimalFeaturePrivilege())
      )
      .some(p => selectedFeaturePrivileges.includes(p.id));
  });

  useEffect(() => {
    const hasMinimalFeaturePrivilegeSelected = feature.allPrivileges
      .filter(
        ap =>
          ap instanceof SubFeaturePrivilege ||
          (ap instanceof PrimaryFeaturePrivilege && ap.isMinimalFeaturePrivilege())
      )
      .some(p => selectedFeaturePrivileges.includes(p.id));

    if (!hasMinimalFeaturePrivilegeSelected && isCustomizing) {
      setIsCustomizing(false);
    }
  }, [feature.allPrivileges, isCustomizing, selectedFeaturePrivileges]);

  const onCustomizeSubFeatureChange = (e: EuiSwitchEvent) => {
    onChange(
      feature.id,
      privilegeCalculator.updateSelectedFeaturePrivilegesForCustomization(
        feature.id,
        e.target.checked
      )
    );
    setIsCustomizing(e.target.checked);
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiSwitch
          label="Customize sub-feature privileges"
          checked={isCustomizing}
          onChange={onCustomizeSubFeatureChange}
          disabled={disabled || !privilegeCalculator.canCustomizeSubFeaturePrivileges(feature.id)}
        />
      </EuiFlexItem>
      {feature.getSubFeatures().map(subFeature => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
              privilegeCalculator={privilegeCalculator}
              featureId={feature.id}
              subFeature={subFeature}
              onChange={updatedPrivileges => onChange(feature.id, updatedPrivileges)}
              selectedFeaturePrivileges={selectedFeaturePrivileges}
              disabled={disabled || !isCustomizing}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
