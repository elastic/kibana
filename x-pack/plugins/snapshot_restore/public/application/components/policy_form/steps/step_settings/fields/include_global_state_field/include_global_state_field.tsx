/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useMemo } from 'react';
import { sortBy } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIconTip,
} from '@elastic/eui';

import { SlmPolicyPayload } from '../../../../../../../../common/types';
import { PolicyValidation } from '../../../../../../services/validation';
import { useLoadFeatures } from '../../../../../../services/http/policy_requests';

interface Props {
  policy: SlmPolicyPayload;
  onUpdate: (arg: Partial<SlmPolicyPayload['config']>) => void;
  errors: PolicyValidation['errors'];
}

export type FeaturesOption = EuiComboBoxOptionOption<string>;

export const IncludeGlobalStateField: FunctionComponent<Props> = ({ policy, onUpdate }) => {
  const { config = {} } = policy;
  const { error: errorLoadingFeatures, isLoading: isLoadingFeatures, data } = useLoadFeatures();

  const features = useMemo(() => {
    if (!isLoadingFeatures && !errorLoadingFeatures) {
      const featuresList = data?.features.map((feature) => ({
        label: feature.name,
      }));

      return sortBy(featuresList, 'label');
    }

    return [];
  }, [isLoadingFeatures, errorLoadingFeatures, data]);

  const [selectedOptions, setSelected] = useState(
    config?.featureStates?.map((feature) => ({ label: feature })) as FeaturesOption[]
  );

  const onChange = (selected: FeaturesOption[]) => {
    setSelected(selected);
    onUpdate({
      featureStates: selected.map((option) => option.label),
    });
  };

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescriptionTitle"
              defaultMessage="Include global state and feature states"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.includeGlobalStateDescription"
          defaultMessage="Stores the global cluster state and the state for all the features as part of the snapshot. This will capture all system indices and other required indices and data streams in addition to any specific indices that have been selected for capture."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="globalStateToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.policyIncludeGlobalStateLabel"
              defaultMessage="Include global state and feature states"
            />
          }
          checked={config.includeGlobalState === undefined || config.includeGlobalState}
          onChange={(e) => {
            onUpdate({
              includeGlobalState: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
      {config.includeGlobalState && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={
              <>
                <FormattedMessage
                  id="xpack.snapshotRestore.policyForm.stepSettings.featureStatesTitle"
                  defaultMessage="Include feature states from"
                />{' '}
                <EuiIconTip
                  type="questionInCircle"
                  content={
                    <span>
                      <FormattedMessage
                        id="xpack.snapshotRestore.policyForm.stepSettings.featureStatesTooltip"
                        defaultMessage="A feature state contains the indices, system indices and data streams used to store configurations, history, and other data for an Elastic feature."
                      />
                    </span>
                  }
                  iconProps={{
                    className: 'eui-alignTop',
                  }}
                />
              </>
            }
          >
            <EuiComboBox
              aria-label="Select features you want to include in the snapshot"
              placeholder="All features"
              options={features}
              selectedOptions={selectedOptions}
              onChange={onChange}
              isLoading={isLoadingFeatures}
              isClearable={true}
              data-test-subj="demoComboBox"
            />
          </EuiFormRow>
        </>
      )}
    </EuiDescribedFormGroup>
  );
};
