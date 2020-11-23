/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { EuiSpacer, EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { Coordinate } from '../../../../typings/timeseries';
import { ChartPreview } from '../chart_preview';

interface Props {
  alertTypeName: string;
  setAlertParams: (key: string, value: any) => void;
  setAlertProperty: (key: string, value: any) => void;
  defaults: Record<string, any>;
  fields: React.ReactNode[];
  chartPreviewData?: Coordinate[];
}

export function ServiceAlertTrigger(props: Props) {
  const { serviceName } = useParams<{ serviceName?: string }>();

  const {
    fields,
    setAlertParams,
    setAlertProperty,
    alertTypeName,
    defaults,
    chartPreviewData = [],
  } = props;

  const params: Record<string, any> = {
    ...defaults,
    serviceName,
  };

  useEffect(() => {
    // we only want to run this on mount to set default values

    const alertName = params.serviceName
      ? `${alertTypeName} | ${params.serviceName}`
      : alertTypeName;
    setAlertProperty('name', alertName);

    const tags = ['apm'];
    if (params.serviceName) {
      tags.push(`service.name:${params.serviceName}`.toLowerCase());
    }
    setAlertProperty('tags', tags);
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
      <ChartPreview data={chartPreviewData} />
      <EuiSpacer size="m" />
    </>
  );
}
