/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTableColumn,
  EuiIcon,
  EuiInMemoryTable,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { asDuration } from '../../../../common/utils/formatters';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ServiceLink } from '../service_link';
import { getSpanIcon } from '../span_icon/get_span_icon';

type SpanLinksDetails =
  APIReturnType<'GET /internal/apm/span_links/details'>['spanLinksDetails'];

type SpanLinkDetails = SpanLinksDetails[0];

interface Props {
  items: SpanLinksDetails;
}

export function SpanLinksTable({ items }: Props) {
  const columns: Array<EuiBasicTableColumn<SpanLinkDetails>> = [
    {
      field: 'serviceName',
      name: 'Service name',
      sortable: true,
      render: (_, { serviceName, agentName }) => {
        if (serviceName) {
          return (
            <ServiceLink
              serviceName={serviceName}
              agentName={agentName}
              query={{
                rangeFrom: 'now-15m',
                rangeTo: 'now',
                kuery: '',
                serviceGroup: '',
                comparisonEnabled: true,
                environment: 'ENVIRONMENT_ALL',
              }}
            />
          );
        }
        return serviceName;
      },
    },
    {
      field: 'spanId',
      name: 'Span',
      sortable: true,
      render: (_, { spanId, spanSubtype, spanType }) => {
        return (
          <>
            <EuiIcon type={getSpanIcon(spanType, spanSubtype)} size="l" />
            {spanId}
          </>
        );
      },
    },
    {
      field: 'duration',
      name: 'Span duration',
      sortable: true,
      render: (_, { duration }) => {
        return (
          <EuiText size="s" color="subdued">
            {asDuration(duration)}
          </EuiText>
        );
      },
    },
  ];

  return (
    <EuiInMemoryTable
      items={items}
      columns={columns}
      sorting={true}
      pagination={true}
    />
  );
}
