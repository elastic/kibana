/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { NewPackagePolicy } from '../../../../types';
import { CreatePackagePolicyFrom } from '../types';

export interface CustomConfigurePackagePolicyProps {
  packageName: string;
  from: CreatePackagePolicyFrom;
  packagePolicy: NewPackagePolicy;
  packagePolicyId?: string;
}

/**
 * Custom content type that external plugins can provide to Ingest's
 * package policy UI.
 */
export type CustomConfigurePackagePolicyContent = React.FC<CustomConfigurePackagePolicyProps>;

type AllowedPackageKey = 'endpoint';
const PackagePolicyMapping: {
  [key: string]: CustomConfigurePackagePolicyContent;
} = {};

/**
 * Plugins can call this function from the start lifecycle to
 * register a custom component in the Ingest package policy.
 */
export function registerPackagePolicyComponent(
  key: AllowedPackageKey,
  value: CustomConfigurePackagePolicyContent
) {
  PackagePolicyMapping[key] = value;
}

const EmptyPackagePolicy: CustomConfigurePackagePolicyContent = () => (
  <EuiEmptyPrompt
    iconType="checkInCircleFilled"
    iconColor="secondary"
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestManager.createPackagePolicy.stepConfigure.noPolicyOptionsMessage"
            defaultMessage="Nothing to configure"
          />
        </p>
      </EuiText>
    }
  />
);

export const CustomPackagePolicy = (props: CustomConfigurePackagePolicyProps) => {
  const CustomPackagePolicyContent = PackagePolicyMapping[props.packageName] || EmptyPackagePolicy;
  return <CustomPackagePolicyContent {...props} />;
};
