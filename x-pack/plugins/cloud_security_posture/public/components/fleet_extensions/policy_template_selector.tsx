/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PosturePolicyTemplate } from '../../../common/types';
import { RadioGroup } from './csp_boxed_radio_group';

export const PolicyTemplateSelector = ({
  policy,
  selectedTemplate,
  setPolicyTemplate,
}: {
  selectedTemplate: PosturePolicyTemplate;
  policy: NewPackagePolicy;
  setPolicyTemplate(template: PosturePolicyTemplate): void;
}) => {
  const policyTemplates = new Set(policy.inputs.map((input) => input.policy_template!));

  return (
    <div>
      <EuiText color={'subdued'} size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.selectIntegrationTypeTitle"
          defaultMessage="Select the type of security posture management integration you want to configure"
        />
      </EuiText>
      <EuiSpacer />
      <RadioGroup
        options={Array.from(policyTemplates, (v) => ({ id: v, label: v.toUpperCase() }))}
        idSelected={selectedTemplate}
        onChange={(id) => setPolicyTemplate(id as PosturePolicyTemplate)}
      />
      <EuiSpacer size="xl" />
    </div>
  );
};
