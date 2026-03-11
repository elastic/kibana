/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React, { Fragment } from 'react';
import { Stacktrace, PlaintextStacktrace } from '@kbn/event-stacktrace';
import { Duration, Timestamp } from '@kbn/apm-ui-shared';
import { OpenInDiscover } from '../../../../../../shared/links/discover_links/open_in_discover';
import type { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { useFetcher, isPending } from '../../../../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../../../../hooks/use_time_range';
import { SpanMetadata } from '../../../../../../shared/metadata_table/span_metadata';
import { getSpanLinksTabContent } from '../../../../../../shared/span_links/span_links_tab_content';
import { Summary } from '../../../../../../shared/summary';
import { CompositeSpanDurationSummaryItem } from '../../../../../../shared/summary/composite_span_duration_summary_item';
import { HttpInfoSummaryItem } from '../../../../../../shared/summary/http_info_summary_item';
import { SyncBadge } from '../badge/sync_badge';
import { FailureBadge } from '../failure_badge';
import { ResponsiveFlyout } from '../responsive_flyout';
import type { SpanLinksCount } from '../waterfall_helpers/waterfall_helpers';
import { SpanDatabase } from './span_db';
import { StickySpanProperties } from './sticky_span_properties';

function formatType(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.navigationTimingLabel',
        {
          defaultMessage: 'Navigation timing',
        }
      );
    default:
      return type;
  }
}

function formatSubtype(subtype: string | undefined) {
  switch (subtype) {
    case 'mysql':
      return 'MySQL';
    default:
      return subtype;
  }
}

function getSpanTypes(span: Span) {
  const { type, subtype, action } = span.span;

  return {
    spanType: formatType(type),
    spanSubtype: formatSubtype(subtype),
    spanAction: action,
  };
}

const ContainerWithMarginRight = styled.div`
  /* add margin to all direct descendants */
  & > * {
    margin-right: ${({ theme }) => theme.euiTheme.size.xs};
  }
`;

interface Props {
  spanId: string;
  parentTransactionId?: string;
  traceId: string;
  totalDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
  onClose: () => void;
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
}

const INITIAL_DATA = {
  span: undefined,
  parentTransaction: undefined,
};

export function SpanFlyout({
  spanId,
  parentTransactionId,
  traceId,
  totalDuration,
  onClose,
  spanLinksCount,
  flyoutDetailTab,
  rangeFrom,
  rangeTo,
  kuery,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/spans/{spanId}', {
        params: {
          path: { traceId, spanId },
          query: { parentTransactionId, start, end },
        },
      });
    },
    [traceId, spanId, parentTransactionId, start, end]
  );

  const { span, parentTransaction } = data;

  const isLoading = isPending(status);

  const spanDetailsTitle = i18n.translate(
    'xpack.apm.transactionDetails.spanFlyout.spanDetailsTitle',
    {
      defaultMessage: 'Span details',
    }
  );

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} size="m" ownFocus={true} aria-label={spanDetailsTitle}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>{spanDetailsTitle}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {span && (
              <EuiFlexItem grow={false}>
                <OpenInDiscover
                  dataTestSubj="spanFlyoutViewSpanInDiscoverLink"
                  variant="button"
                  indexType="traces"
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  queryParams={{
                    kuery,
                    spanId,
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {span?.span.composite && (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiCallOut announceOnMount color="warning" iconType="gear" size="s">
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.compositeExampleWarning',
                    {
                      defaultMessage:
                        'This is a sample document for a group of consecutive, similar spans',
                    }
                  )}
                </EuiCallOut>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSkeletonText isLoading={isLoading}>
            {span && (
              <SpanFlyoutBody
                span={span}
                parentTransaction={parentTransaction}
                totalDuration={totalDuration}
                spanLinksCount={spanLinksCount}
                flyoutDetailTab={flyoutDetailTab}
              />
            )}
          </EuiSkeletonText>
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}

function SpanFlyoutBody({
  span,
  parentTransaction,
  totalDuration,
  spanLinksCount,
  flyoutDetailTab,
}: {
  span: Span;
  parentTransaction?: Transaction;
  totalDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
}) {
  const stackframes = span.span.stacktrace;
  const plaintextStacktrace = span.code?.stacktrace;
  const codeLanguage = parentTransaction?.service.language?.name;
  const spanDb = span.span.db;
  const spanTypes = getSpanTypes(span);
  const spanHttpStatusCode =
    span.http?.response?.status_code || span.span?.http?.response?.status_code;
  const spanHttpUrl = span.url?.original || span.span?.http?.url?.original;
  const spanHttpMethod = span.http?.request?.method || span.span?.http?.method;

  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: span.trace?.id,
    spanId: span.span?.id,
    processorEvent: ProcessorEvent.span,
  });

  const tabs = [
    {
      id: 'metadata',
      name: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <Fragment>
          <EuiSpacer size="m" />
          <SpanMetadata span={span} />
        </Fragment>
      ),
    },
    ...(!isEmpty(stackframes) || !isEmpty(plaintextStacktrace)
      ? [
          {
            id: 'stack-trace',
            'data-test-subj': 'spanStacktraceTab',
            name: i18n.translate('xpack.apm.transactionDetails.spanFlyout.stackTraceTabLabel', {
              defaultMessage: 'Stack Trace',
            }),
            content: (
              <Fragment>
                <EuiSpacer size="l" />
                {stackframes ? (
                  <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
                ) : (
                  <PlaintextStacktrace
                    stacktrace={plaintextStacktrace}
                    codeLanguage={codeLanguage}
                  />
                )}
              </Fragment>
            ),
          },
        ]
      : []),
    ...(spanLinksTabContent ? [spanLinksTabContent] : []),
  ];

  const initialTab = tabs.find(({ id }) => id === flyoutDetailTab) ?? tabs[0];
  return (
    <>
      <StickySpanProperties span={span} transaction={parentTransaction} />
      <EuiSpacer size="m" />
      <Summary
        items={[
          <Timestamp timestamp={span.timestamp.us / 1000} renderMode="tooltip" />,
          <>
            <Duration
              duration={span.span.duration.us}
              parent={{ duration: totalDuration, type: 'transaction', loading: false }}
              showTooltip
            />
            {span.span.composite && (
              <CompositeSpanDurationSummaryItem
                count={span.span.composite.count}
                durationSum={span.span.composite.sum.us}
              />
            )}
          </>,
          <ContainerWithMarginRight>
            {spanHttpUrl && (
              <HttpInfoSummaryItem
                method={spanHttpMethod}
                url={spanHttpUrl}
                status={spanHttpStatusCode}
              />
            )}
            <EuiToolTip
              content={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanType', {
                defaultMessage: 'Type',
              })}
            >
              <EuiBadge color="hollow" tabIndex={0}>
                {spanTypes.spanType}
              </EuiBadge>
            </EuiToolTip>
            {spanTypes.spanSubtype && (
              <EuiToolTip
                content={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanSubtype', {
                  defaultMessage: 'Subtype',
                })}
              >
                <EuiBadge color="hollow" tabIndex={0}>
                  {spanTypes.spanSubtype}
                </EuiBadge>
              </EuiToolTip>
            )}
            {spanTypes.spanAction && (
              <EuiToolTip
                content={i18n.translate('xpack.apm.transactionDetails.spanFlyout.spanAction', {
                  defaultMessage: 'Action',
                })}
              >
                <EuiBadge color="hollow" tabIndex={0}>
                  {spanTypes.spanAction}
                </EuiBadge>
              </EuiToolTip>
            )}

            <FailureBadge outcome={span.event?.outcome} />

            <SyncBadge sync={span.span.sync} agentName={span.agent.name} />
          </ContainerWithMarginRight>,
        ]}
      />
      <EuiHorizontalRule />
      <SpanDatabase spanDb={spanDb} />
      <EuiTabbedContent tabs={tabs} initialSelectedTab={initialTab} />
    </>
  );
}
