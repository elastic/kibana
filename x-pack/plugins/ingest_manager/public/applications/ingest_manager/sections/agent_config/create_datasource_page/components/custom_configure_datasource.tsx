/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { NewDatasource } from '../../../../types';
import { CreateDatasourceFrom } from '../types';

export interface CustomConfigureDatasourceProps {
  packageName: string;
  from: CreateDatasourceFrom;
  datasource: NewDatasource;
  datasourceId?: string;
}

/**
 * Custom content type that external plugins can provide to Ingest's
 * Datasource configuration.
 */
export type CustomConfigureDatasourceContent = React.FC<CustomConfigureDatasourceProps>;

type AllowedDatasourceKey = 'endpoint';
const ConfigureDatasourceMapping: {
  [key: string]: CustomConfigureDatasourceContent;
} = {};

/**
 * Plugins can call this function from the start lifecycle to
 * register a custom component in the Ingest Datasource configuration.
 */
export function registerDatasource(
  key: AllowedDatasourceKey,
  value: CustomConfigureDatasourceContent
) {
  ConfigureDatasourceMapping[key] = value;
}

const EmptyConfigureDatasource: CustomConfigureDatasourceContent = () => (
  <EuiEmptyPrompt
    iconType="checkInCircleFilled"
    iconColor="secondary"
    body={
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.ingestManager.createDatasource.stepConfigure.noConfigOptionsMessage"
            defaultMessage="Nothing to configure"
          />
        </p>
      </EuiText>
    }
  />
);

export const CustomConfigureDatasource = (props: CustomConfigureDatasourceProps) => {
  const ConfigureDatasourceContent =
    ConfigureDatasourceMapping[props.packageName] || EmptyConfigureDatasource;
  return <ConfigureDatasourceContent {...props} />;
};
