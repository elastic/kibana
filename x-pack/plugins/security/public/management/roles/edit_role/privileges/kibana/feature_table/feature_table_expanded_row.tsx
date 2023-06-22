/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSwitch } from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { SecuredFeature } from '../../../../model';
import type { PrivilegeFormCalculator } from '../privilege_form_calculator';
import { SubFeatureForm } from './sub_feature_form';

interface Props {
  feature: SecuredFeature;
  privilegeCalculator: PrivilegeFormCalculator;
  privilegeIndex: number;
  selectedFeaturePrivileges: string[];
  allSpacesSelected: boolean;
  disabled?: boolean;
  licenseAllowsSubFeatPrivCustomization: boolean;
  onChange: (featureId: string, featurePrivileges: string[]) => void;
}

export const FeatureTableExpandedRow = ({
  feature,
  onChange,
  privilegeIndex,
  privilegeCalculator,
  selectedFeaturePrivileges,
  allSpacesSelected,
  disabled,
  licenseAllowsSubFeatPrivCustomization,
}: Props) => {
  const [isCustomizing, setIsCustomizing] = useState(() => {
    return (
      licenseAllowsSubFeatPrivCustomization &&
      feature.getMinimalFeaturePrivileges().some((p) => selectedFeaturePrivileges.includes(p.id))
    );
  });

  useEffect(() => {
    const hasMinimalFeaturePrivilegeSelected = feature
      .getMinimalFeaturePrivileges()
      .some((p) => selectedFeaturePrivileges.includes(p.id));

    if (
      (!licenseAllowsSubFeatPrivCustomization || !hasMinimalFeaturePrivilegeSelected) &&
      isCustomizing
    ) {
      setIsCustomizing(false);
    }
  }, [feature, isCustomizing, selectedFeaturePrivileges, licenseAllowsSubFeatPrivCustomization]);

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
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <div>
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
              !licenseAllowsSubFeatPrivCustomization ||
              !privilegeCalculator.canCustomizeSubFeaturePrivileges(feature.id, privilegeIndex)
            }
          />
          {licenseAllowsSubFeatPrivCustomization ? undefined : (
            <EuiIconTip
              data-test-subj="subFeaturesTip"
              position="right"
              aria-label="sub-feature-information-tip"
              size="m"
              type="iInCircle"
              color="subdued"
              iconProps={{
                className: 'eui-alignTop',
              }}
              content={i18n.translate(
                'xpack.security.management.editRole.featureTable.cannotCustomizeSubFeaturesTooltip',
                {
                  defaultMessage:
                    'Customization of sub-feature privileges is a subscription feature.',
                }
              )}
            />
          )}
        </div>
      </EuiFlexItem>
      {feature.getSubFeatures().map((subFeature) => {
        const isDisabledDueToSpaceSelection = subFeature.requireAllSpaces && !allSpacesSelected;

        return (
          <EuiFlexItem key={subFeature.name}>
            <SubFeatureForm
              privilegeCalculator={privilegeCalculator}
              privilegeIndex={privilegeIndex}
              featureId={feature.id}
              subFeature={subFeature}
              onChange={(updatedPrivileges) => onChange(feature.id, updatedPrivileges)}
              selectedFeaturePrivileges={selectedFeaturePrivileges}
              disabled={disabled || !isCustomizing || isDisabledDueToSpaceSelection}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
