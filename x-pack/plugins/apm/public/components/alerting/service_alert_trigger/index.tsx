/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect } from 'react';

interface Props {
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
  chartPreview?: React.ReactNode;
}

export function ServiceAlertTrigger(props: Props) {
  const { fields, setRuleParams, defaults, chartPreview } = props;

  const params: Record<string, any> = {
    ...defaults,
  };

  useEffect(() => {
    // we only want to run this on mount to set default values
    Object.keys(params).forEach((key) => {
      setRuleParams(key, params[key]);
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
