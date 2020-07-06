/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { useUrlParams } from '../../../hooks/useUrlParams';

interface Props {
  alertTypeName: string;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
}

export function ServiceAlertTrigger(props: Props) {
  const { urlParams } = useUrlParams();

  const {
    fields,
    setAlertParams,
    setAlertProperty,
    alertTypeName,
    defaults,
  } = props;

  const params: Record<string, any> = {
    ...defaults,
    serviceName: urlParams.serviceName!,
  };

  useEffect(() => {
    // we only want to run this on mount to set default values
    setAlertProperty('name', `${alertTypeName} | ${params.serviceName}`);
    setAlertProperty('tags', [
      'apm',
      `service.name:${params.serviceName}`.toLowerCase(),
    ]);
    Object.keys(params).forEach((key) => {
      setAlertParams(key, params[key]);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGrid gutterSize="l" direction="row" columns={2}>
        {fields.map((field, index) => (
          <EuiFlexItem grow={false} key={index}>
            {field}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="m" />
    </>
  );
}
