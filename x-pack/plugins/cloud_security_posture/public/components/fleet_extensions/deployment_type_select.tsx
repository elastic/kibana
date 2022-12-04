/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiToolTip,
  EuiFormRow,
  EuiIcon,
  type EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloudPostureIntegrations } from '../../common/constants';
import { CLOUDBEAT_INTEGRATION, POLICY_TEMPLATE } from '../../../common/constants';

interface Props {
  policyTemplate: POLICY_TEMPLATE;
  type: CLOUDBEAT_INTEGRATION;
  onChange?: (type: CLOUDBEAT_INTEGRATION) => void;
  isDisabled?: boolean;
}

const kubeDeployOptions = (
  policyTemplate: POLICY_TEMPLATE
): Array<EuiComboBoxOptionOption<CLOUDBEAT_INTEGRATION>> =>
  cloudPostureIntegrations[policyTemplate].options.map((o) => ({ value: o.type, label: o.name }));

const KubernetesDeploymentFieldLabel = () => (
  <EuiToolTip
    content={
      <FormattedMessage
        id="xpack.csp.createPackagePolicy.stepConfigure.integrationSettingsSection.kubernetesDeploymentLabelTooltip"
        defaultMessage="Select your Kubernetes deployment type"
      />
    }
  >
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow style={{ flexDirection: 'row' }}>
        <FormattedMessage
          id="xpack.csp.createPackagePolicy.stepConfigure.integrationSettingsSection.kubernetesDeploymentLabel"
          defaultMessage="Kubernetes Deployment"
        />
        &nbsp;
        <EuiIcon size="m" color="subdued" type="questionInCircle" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiToolTip>
);

export const DeploymentTypeSelect = ({ policyTemplate, type, isDisabled, onChange }: Props) => (
  <EuiDescribedFormGroup title={<div />}>
    <EuiFormRow label={<KubernetesDeploymentFieldLabel />}>
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={kubeDeployOptions(policyTemplate)}
        selectedOptions={kubeDeployOptions(policyTemplate).filter((o) => o.value === type)}
        isDisabled={isDisabled}
        onChange={(options) => !isDisabled && onChange?.(options[0].value!)}
      />
    </EuiFormRow>
  </EuiDescribedFormGroup>
);
