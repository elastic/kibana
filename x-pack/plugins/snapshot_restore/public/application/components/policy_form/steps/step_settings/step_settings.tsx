/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { StepProps } from '..';
import { SlmPolicyPayload } from '../../../../../../common/types';

import { useCore } from '../../../../app_context';
import {
  IncludeFeatureStatesField,
  IncludeGlobalStateField,
  IndicesAndDataStreamsField,
} from './fields';

export const PolicyStepSettings: React.FunctionComponent<StepProps> = ({
  policy,
  indices,
  dataStreams,
  updatePolicy,
  errors,
}) => {
  const { docLinks } = useCore();
  const { config = {}, isManagedPolicy } = policy;

  const updatePolicyConfig = (
    updatedFields: Partial<SlmPolicyPayload['config']>,
    validationHelperData = {}
  ): void => {
    const newConfig = { ...config, ...updatedFields };
    updatePolicy(
      {
        config: newConfig,
      },
      validationHelperData
    );
  };

  const renderIgnoreUnavailableField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescriptionTitle"
              defaultMessage="Ignore unavailable indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableDescription"
          defaultMessage="Ignores indices that are unavailable when taking the snapshot. Otherwise, the entire snapshot will fail."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="ignoreUnavailableIndicesToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.ignoreUnavailableLabel"
              defaultMessage="Ignore unavailable indices"
            />
          }
          checked={Boolean(config.ignoreUnavailable)}
          onChange={(e) => {
            updatePolicyConfig({
              ignoreUnavailable: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  const renderPartialField = () => (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialDescriptionTitle"
              defaultMessage="Allow partial indices"
            />
          </h3>
        </EuiTitle>
      }
      description={
        <FormattedMessage
          id="xpack.snapshotRestore.policyForm.stepSettings.partialDescription"
          defaultMessage="Allows snapshots of indices with primary shards that are unavailable. Otherwise, the entire snapshot will fail."
        />
      }
      fullWidth
    >
      <EuiFormRow hasEmptyLabelSpace fullWidth>
        <EuiSwitch
          data-test-subj="partialIndicesToggle"
          label={
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.partialIndicesToggleSwitch"
              defaultMessage="Allow partial indices"
            />
          }
          checked={Boolean(config.partial)}
          onChange={(e) => {
            updatePolicyConfig({
              partial: e.target.checked,
            });
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );

  return (
    <div className="snapshotRestore__policyForm__stepSettings">
      {/* Step title and doc link */}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.snapshotRestore.policyForm.stepSettingsTitle"
                defaultMessage="Snapshot settings"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={docLinks.links.snapshotRestore.createSnapshot}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.snapshotRestore.policyForm.stepSettings.docsButtonLabel"
              defaultMessage="Snapshot docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      <IndicesAndDataStreamsField
        isManagedPolicy={isManagedPolicy}
        errors={errors}
        dataStreams={dataStreams}
        indices={indices}
        policy={policy}
        onUpdate={updatePolicyConfig}
      />

      {renderIgnoreUnavailableField()}
      {renderPartialField()}

      <IncludeGlobalStateField errors={errors} policy={policy} onUpdate={updatePolicyConfig} />
      <IncludeFeatureStatesField errors={errors} policy={policy} onUpdate={updatePolicyConfig} />
    </div>
  );
};
