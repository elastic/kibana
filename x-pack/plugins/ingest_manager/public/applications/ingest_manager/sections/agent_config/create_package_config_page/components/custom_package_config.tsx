/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { NewPackageConfig } from '../../../../types';
import { CreatePackageConfigFrom } from '../types';

export interface CustomConfigurePackageConfigProps {
  packageName: string;
  from: CreatePackageConfigFrom;
  packageConfig: NewPackageConfig;
  packageConfigId?: string;
}

/**
 * Custom content type that external plugins can provide to Ingest's
 * package config UI.
 */
export type CustomConfigurePackageConfigContent = React.FC<CustomConfigurePackageConfigProps>;

type AllowedPackageKey = 'endpoint';
const PackageConfigMapping: {
  [key: string]: CustomConfigurePackageConfigContent;
} = {};

/**
 * Plugins can call this function from the start lifecycle to
 * register a custom component in the Ingest package config.
 */
export function registerPackageConfigComponent(
  key: AllowedPackageKey,
  value: CustomConfigurePackageConfigContent
) {
  PackageConfigMapping[key] = value;
}

const EmptyPackageConfig: CustomConfigurePackageConfigContent = () => (
  <EuiEmptyPrompt
    iconType="checkInCircleFilled"
    iconColor="secondary"
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestManager.createPackageConfig.stepConfigure.noConfigOptionsMessage"
            defaultMessage="Nothing to configure"
          />
        </p>
      </EuiText>
    }
  />
);

export const CustomPackageConfig = (props: CustomConfigurePackageConfigProps) => {
  const CustomPackageConfigContent = PackageConfigMapping[props.packageName] || EmptyPackageConfig;
  return <CustomPackageConfigContent {...props} />;
};
