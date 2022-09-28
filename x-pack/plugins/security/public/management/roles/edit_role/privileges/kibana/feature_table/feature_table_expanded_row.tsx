/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiSwitchEvent } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { SecuredFeature } from '../../../../model';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { SubFeatureForm } from './sub_feature_form';
import { i18n } from '@kbn/i18n';

interface Props {
  feature: SecuredFeature;
  privilegeCalculator: PrivilegeFormCalculator;
  privilegeIndex: number;
  selectedFeaturePrivileges: string[];
  disabled?: boolean;
  canCustomizeSubFeaturePrivileges?: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

export const FeatureTableExpandedRow = ({
  feature,
  onChange,
  privilegeIndex,
  privilegeCalculator,
  selectedFeaturePrivileges,
  disabled,
  canCustomizeSubFeaturePrivileges,
}: Props) => {
  const [isCustomizing, setIsCustomizing] = useState(() => {
    return feature
      .getMinimalFeaturePrivileges()
      .some((p) => selectedFeaturePrivileges.includes(p.id));
  });

  useEffect(() => {
    const hasMinimalFeaturePrivilegeSelected = feature
      .getMinimalFeaturePrivileges()
      .some((p) => selectedFeaturePrivileges.includes(p.id));

    if (!hasMinimalFeaturePrivilegeSelected && isCustomizing) {
      setIsCustomizing(false);
    }
  }, [feature, isCustomizing, selectedFeaturePrivileges]);

  const onCustomizeSubFeatureChange = (e: EuiSwitchEvent) => {
    onChange(
      feature.id,
      privilegeCalculator.updateSelectedFeaturePrivilegesForCustomization(
        feature.id,
        privilegeIndex,
        e.target.checked
      )
    );
    setIsCustomizing(e.target.checked);
  };

  return (
    <EuiFlexGroup direction="column">
      {canCustomizeSubFeaturePrivileges ?
        <EuiFlexItem>
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.security.management.editRole.featureTable.customizeSubFeaturePrivilegesSwitchLabel"
                defaultMessage="Customize sub-feature privileges"
              />
            }
            checked={isCustomizing}
            onChange={onCustomizeSubFeatureChange}
            data-test-subj="customizeSubFeaturePrivileges"
            disabled={
              disabled ||
              !privilegeCalculator.canCustomizeSubFeaturePrivileges(feature.id, privilegeIndex)
            }
          />
        </EuiFlexItem> :
        <EuiFlexItem grow={false}>
          <div>
            <EuiIconTip
              position='right'
              aria-label="sub-feature-information-tip"
              size="l"
              type="iInCircle"
              color="subdued"
              content={i18n.translate(
                'xpack.security.management.editRole.featureTable.cannotCustomizeSubFeaturesTooltip',
                {
                  defaultMessage: 'Customization of sub-feature privileges is a subscription feature.',
                }
              )}
            />
          </div>
        </EuiFlexItem>
      }
      {feature.getSubFeatures().map((subFeature) => {
        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
              privilegeCalculator={privilegeCalculator}
              privilegeIndex={privilegeIndex}
              featureId={feature.id}
              subFeature={subFeature}
              onChange={(updatedPrivileges) => onChange(feature.id, updatedPrivileges)}
              selectedFeaturePrivileges={selectedFeaturePrivileges}
              disabled={disabled || !isCustomizing}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
