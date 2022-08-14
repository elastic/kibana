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
import { i18n } from '@kbn/i18n';
import { CLOUDBEAT_EKS, CLOUDBEAT_VANILLA } from '../../../common/constants';

export type InputType = typeof CLOUDBEAT_EKS | typeof CLOUDBEAT_VANILLA;

interface Props {
  type: InputType;
  onChange?: (type: InputType) => void;
  isDisabled?: boolean;
}

const kubeDeployOptions: Array<EuiComboBoxOptionOption<InputType>> = [
  {
    value: CLOUDBEAT_VANILLA,
    label: i18n.translate(
      'xpack.csp.createPackagePolicy.stepConfigure.integrationSettingsSection.vanillaKubernetesDeploymentOption',
      { defaultMessage: 'Unmanaged Kubernetes' }
    ),
  },
  {
    value: CLOUDBEAT_EKS,
    label: i18n.translate(
      'xpack.csp.createPackagePolicy.stepConfigure.integrationSettingsSection.eksKubernetesDeploymentOption',
      { defaultMessage: 'EKS (Elastic Kubernetes Service)' }
    ),
  },
];

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

export const DeploymentTypeSelect = ({ type, isDisabled, onChange }: Props) => (
  <EuiDescribedFormGroup title={<div />}>
    <EuiFormRow label={<KubernetesDeploymentFieldLabel />}>
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={kubeDeployOptions}
        selectedOptions={kubeDeployOptions.filter((o) => o.value === type)}
        isDisabled={isDisabled}
        onChange={(options) => !isDisabled && onChange?.(options[0].value!)}
      />
    </EuiFormRow>
  </EuiDescribedFormGroup>
);
