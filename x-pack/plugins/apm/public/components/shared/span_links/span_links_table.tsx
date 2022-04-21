/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asDuration } from '../../../../common/utils/formatters';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
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
  const { link } = useApmRouter();
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const columns: Array<EuiBasicTableColumn<SpanLinkDetails>> = [
    {
      field: 'serviceName',
      name: i18n.translate('xpack.apm.spanLinks.table.serviceName', {
        defaultMessage: 'Service name',
      }),
      sortable: true,
      render: (_, { serviceName, agentName, environment }) => {
        if (serviceName) {
          return (
            <ServiceLink
              serviceName={serviceName}
              agentName={agentName}
              query={{
                rangeFrom,
                rangeTo,
                kuery: '',
                serviceGroup: '',
                comparisonEnabled: true,
                environment: environment || 'ENVIRONMENT_ALL',
              }}
            />
          );
        }
        return (
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type="stopSlash" size="m" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate('xpack.apm.spanLinks.table.serviceName.unknown', {
                defaultMessage: 'Unknown',
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'spanId',
      name: i18n.translate('xpack.apm.spanLinks.table.span', {
        defaultMessage: 'Span',
      }),
      sortable: true,
      render: (_, { spanId, traceId, spanSubtype, spanType, spanName }) => {
        if (spanName) {
          return (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={getSpanIcon(spanType, spanSubtype)} size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                {/* TODO: caue: this might not work because we pass span.id some times */}
                <EuiLink
                  href={link('/link-to/transaction/{transactionId}', {
                    path: { transactionId: spanId },
                  })}
                >
                  {spanName}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }
        return `${traceId}-${spanId}`;
      },
    },
    {
      field: 'duration',
      name: i18n.translate('xpack.apm.spanLinks.table.spanDuration', {
        defaultMessage: 'Span duration',
      }),
      sortable: true,
      render: (_, { duration }) => {
        return (
          <EuiText size="s" color="subdued">
            {asDuration(duration)}
          </EuiText>
        );
      },
    },
    {
      name: 'Actions',
      actions: [
        {
          render: (item) => {
            return <EuiLink onClick={() => {}}>go to parent trace</EuiLink>;
          },
        },
        {
          render: (item) => {
            return (
              <EuiCopy textToCopy={item.traceId}>
                {(copy) => (
                  <EuiButtonEmpty onClick={copy} flush="both">
                    copy parent trace id
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            );
          },
        },
        {
          render: (item) => {
            return <EuiLink onClick={() => {}}>go to span details</EuiLink>;
          },
        },
        {
          render: (item) => {
            return (
              <EuiCopy textToCopy={item.spanId}>
                {(copy) => (
                  <EuiButtonEmpty onClick={copy} flush="both">
                    copy span id
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            );
          },
        },
      ],
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
