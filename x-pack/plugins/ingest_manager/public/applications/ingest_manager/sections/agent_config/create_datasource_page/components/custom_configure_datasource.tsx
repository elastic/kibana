/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { ConfigureEndpointDatasource } from '../../../../../../../../siem/public';
import { NewDatasource } from '../../../../types';
import { CreateDatasourceFrom } from '../types';

export interface CustomConfigureDatasourceProps {
  packageName: string;
  from: CreateDatasourceFrom;
  datasource: NewDatasource;
}

export type CustomConfigureDatasourceContent = React.FC<CustomConfigureDatasourceProps>;

const ConfigureDatasourceMapping: { [key: string]: CustomConfigureDatasourceContent } = {
  endpoint: ConfigureEndpointDatasource,
};

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
