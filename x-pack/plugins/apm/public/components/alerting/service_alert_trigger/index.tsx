/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Props {
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
  chartPreview?: React.ReactNode;
}

export function ServiceAlertTrigger(props: Props) {
  const { serviceName } = useParams<{ serviceName?: string }>();

  const { fields, setAlertParams, defaults, chartPreview } = props;

  const params: Record<string, any> = {
    ...defaults,
    serviceName,
  };

  useEffect(() => {
    // we only want to run this on mount to set default values
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
      {chartPreview}
      <EuiSpacer size="m" />
    </>
  );
}
