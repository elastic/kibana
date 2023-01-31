/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SpanLinkDetails } from '../../../../common/span_links';
import { asDuration } from '../../../../common/utils/formatters';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { ServiceLink } from '../links/apm/service_link';
import { getSpanIcon } from '../span_icon/get_span_icon';

interface Props {
  items: SpanLinkDetails[];
}

export function SpanLinksTable({ items }: Props) {
  const router = useApmRouter();
  const {
    query: { rangeFrom, rangeTo, comparisonEnabled },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view'
  );
  const [idActionMenuOpen, setIdActionMenuOpen] = useState<
    string | undefined
  >();

  const columns: Array<EuiBasicTableColumn<SpanLinkDetails>> = [
    {
      field: 'serviceName',
      name: i18n.translate('xpack.apm.spanLinks.table.serviceName', {
        defaultMessage: 'Service name',
      }),
      sortable: true,
      render: (_, { details }) => {
        if (details) {
          return (
            <ServiceLink
              serviceName={details.serviceName}
              agentName={details.agentName}
              query={{
                rangeFrom,
                rangeTo,
                kuery: '',
                serviceGroup: '',
                comparisonEnabled,
                environment: details.environment || 'ENVIRONMENT_ALL',
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
      render: (_, { spanId, traceId, details }) => {
        if (details && details.transactionId) {
          return (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="xs"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type={getSpanIcon(details.spanType, details.spanSubtype)}
                  size="l"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink
                  href={router.link('/link-to/transaction/{transactionId}', {
                    path: { transactionId: details.transactionId },
                    query: { waterfallItemId: spanId },
                  })}
                >
                  {details.spanName}
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
      width: '150',
      render: (_, { details }) => {
        return (
          <EuiText size="s" color="subdued">
            {asDuration(details?.duration)}
          </EuiText>
        );
      },
    },
    {
      field: 'actions',
      name: 'Actions',
      width: '100',
      render: (_, { spanId, traceId, details }) => {
        const id = `${traceId}:${spanId}`;
        return (
          <EuiPopover
            button={
              <EuiButtonIcon
                aria-label="Edit"
                iconType="boxesHorizontal"
                onClick={() => {
                  setIdActionMenuOpen(id);
                }}
              />
            }
            isOpen={idActionMenuOpen === id}
            closePopover={() => {
              setIdActionMenuOpen(undefined);
            }}
          >
            <EuiFlexGroup direction="column" gutterSize="s">
              {details?.transactionId && (
                <EuiFlexItem>
                  <EuiLink
                    href={router.link('/link-to/transaction/{transactionId}', {
                      path: { transactionId: details.transactionId },
                    })}
                  >
                    {i18n.translate(
                      'xpack.apm.spanLinks.table.actions.goToTraceDetails',
                      { defaultMessage: 'Go to trace' }
                    )}
                  </EuiLink>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiCopy textToCopy={traceId}>
                  {(copy) => (
                    <EuiButtonEmpty
                      onClick={() => {
                        copy();
                        setIdActionMenuOpen(undefined);
                      }}
                      flush="both"
                    >
                      {i18n.translate(
                        'xpack.apm.spanLinks.table.actions.copyParentTraceId',
                        { defaultMessage: 'Copy parent trace id' }
                      )}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
              {details?.transactionId && (
                <EuiFlexItem>
                  <EuiLink
                    href={router.link('/link-to/transaction/{transactionId}', {
                      path: { transactionId: details.transactionId },
                      query: { waterfallItemId: spanId },
                    })}
                  >
                    {i18n.translate(
                      'xpack.apm.spanLinks.table.actions.goToSpanDetails',
                      { defaultMessage: 'Go to span details' }
                    )}
                  </EuiLink>
                </EuiFlexItem>
              )}
              <EuiFlexItem>
                <EuiCopy textToCopy={spanId}>
                  {(copy) => (
                    <EuiButtonEmpty
                      onClick={() => {
                        copy();
                        setIdActionMenuOpen(undefined);
                      }}
                      flush="both"
                    >
                      {i18n.translate(
                        'xpack.apm.spanLinks.table.actions.copySpanId',
                        { defaultMessage: 'Copy span id' }
                      )}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
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
