/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSwitch, EuiSwitchEvent, EuiText } from '@elastic/eui';
import { SecuredFeature } from '../../../../../../../common/model';
import { SubFeatureForm } from './sub_feature_form';
import { ScopedPrivilegeCalculator } from '../privilege_calculator';

interface Props {
  feature: SecuredFeature;
  privilegeCalculator: ScopedPrivilegeCalculator;
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
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [canCustomize, setCanCustomize] = useState(false);

  useEffect(() => {
    setCanCustomize(
      !Boolean(disabled) && privilegeCalculator.canCustomizeSubFeaturePrivileges(feature.id)
    );

    setIsCustomizing(privilegeCalculator.isCustomizingSubFeaturePrivileges(feature.id));
  }, [disabled, feature.id, privilegeCalculator]);

  const onCustomizeSubFeatureChange = (e: EuiSwitchEvent) => {
    const nextPrimaryFeaturePrivilege = privilegeCalculator.toggleMinimalPrimaryFeaturePrivilege(
      feature.id
    ).id;

    const updatedPrimaryFeaturePrivileges = [nextPrimaryFeaturePrivilege];

    onChange(feature.id, updatedPrimaryFeaturePrivileges);
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
