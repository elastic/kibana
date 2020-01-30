/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent, EuiText } from '@elastic/eui';
import {
  SecuredFeature,
  SubFeaturePrivilege,
  PrimaryFeaturePrivilege,
} from '../../../../../../../common/model';
import { SubFeatureForm } from './sub_feature_form';
import { PrivilegeFormCalculator } from '../privilege_calculator';

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
          disabled={disabled || !privilegeCalculator.canCustomizeSubFeaturePrivileges(feature.id)}
        />
      </EuiFlexItem>
      {feature.subFeatures.map(subFeature => {
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
