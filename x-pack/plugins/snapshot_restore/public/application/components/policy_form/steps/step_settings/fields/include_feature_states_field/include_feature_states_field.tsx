/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiCallOut,
  EuiSpacer,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { FEATURE_STATES_NONE_OPTION } from '../../../../../../../../common/constants';
import { SlmPolicyPayload } from '../../../../../../../../common/types';
import { PolicyValidation } from '../../../../../../services/validation';
import { useLoadFeatures } from '../../../../../../services/http/policy_requests';
import { FeatureStatesFormField } from '../../../../../feature_states_form_field';

interface Props {
  policy: SlmPolicyPayload;
  onUpdate: (arg: Partial<SlmPolicyPayload['config']>) => void;
  errors: PolicyValidation['errors'];
}

export type FeaturesOption = EuiComboBoxOptionOption<string>;

export const IncludeFeatureStatesField: FunctionComponent<Props> = ({ policy, onUpdate }) => {
  const { config = {} } = policy;
  const {
    error: errorLoadingFeatures,
    isLoading: isLoadingFeatures,
    data: featuresResponse,
  } = useLoadFeatures();

  const featuresOptions = useMemo(() => {
    const features = featuresResponse?.features || [];
    return features.map((feature) => feature.name);
  }, [featuresResponse]);

  const selectedOptions = useMemo(() => {
    return config?.featureStates?.map((feature) => ({ label: feature })) as FeaturesOption[];
  }, [config.featureStates]);

  const isFeatureStatesToggleEnabled =
    config.featureStates !== undefined &&
    !config.featureStates.includes(FEATURE_STATES_NONE_OPTION);

  const onFeatureStatesToggleChange = (event: EuiSwitchEvent) => {
    const { checked } = event.target;

    onUpdate({
      featureStates: checked ? [] : [FEATURE_STATES_NONE_OPTION],
    });
  };

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.includeFeatureStatesDescriptionTitle"
              defaultMessage="Include feature state"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.includeFeatureStatesDescription"
          defaultMessage="Includes the configuration, history, and other data stored in Elasticsearch by a feature such as Elasticsearch security."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="featureStatesToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.policyIncludeFeatureStatesLabel"
              defaultMessage="Include feature state from"
            />
          }
          checked={isFeatureStatesToggleEnabled}
          onChange={onFeatureStatesToggleChange}
        />
      </EuiFormRow>

      {isFeatureStatesToggleEnabled && (
        <>
          <EuiSpacer size="m" />
          {!errorLoadingFeatures ? (
            <FeatureStatesFormField
              isLoadingFeatures={isLoadingFeatures}
              featuresOptions={featuresOptions}
              selectedOptions={selectedOptions}
              onUpdateFormSettings={onUpdate}
            />
          ) : (
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={
                <FormattedMessage
                  id="xpack.snapshotRestore.errorLoadingFeatureStatesLabel"
                  defaultMessage="There was an error loading the list of feature states"
                />
              }
            />
          )}
        </>
      )}
    </EuiDescribedFormGroup>
  );
};
