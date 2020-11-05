/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { NewPackagePolicy } from '../../../../types';
import { CreatePackagePolicyFrom } from '../types';
import { useUIExtension } from '../../../../hooks/use_ui_extension';
import { ExtensionWrapper } from '../../../../components/extension_wrapper';

export interface CustomConfigurePackagePolicyProps {
  packageName: string;
  from: CreatePackagePolicyFrom;
  packagePolicy: NewPackagePolicy;
  packagePolicyId?: string;
}

const EmptyPackagePolicy = memo(() => (
  <EuiEmptyPrompt
    iconType="checkInCircleFilled"
    iconColor="secondary"
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.stepConfigure.noPolicyOptionsMessage"
            defaultMessage="Nothing to configure"
          />
        </p>
      </EuiText>
    }
  />
));

export const CustomPackagePolicy = memo<CustomConfigurePackagePolicyProps>((props) => {
  const ExtensionView = useUIExtension(
    props.packageName,
    'integration-policy',
    props.from === 'edit' ? 'edit' : 'create'
  );

  return ExtensionView ? (
    <ExtensionWrapper>
      <ExtensionView {...props} />
    </ExtensionWrapper>
  ) : (
    <EmptyPackagePolicy />
  );
});
