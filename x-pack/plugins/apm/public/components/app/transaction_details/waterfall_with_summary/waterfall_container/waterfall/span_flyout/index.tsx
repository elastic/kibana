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
  EuiLoadingContent,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React, { Fragment } from 'react';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { useFetcher, isPending } from '../../../../../../../hooks/use_fetcher';
import { DiscoverSpanLink } from '../../../../../../shared/links/discover_links/discover_span_link';
import { SpanMetadata } from '../../../../../../shared/metadata_table/span_metadata';
import { getSpanLinksTabContent } from '../../../../../../shared/span_links/span_links_tab_content';
import { Stacktrace } from '../../../../../../shared/stacktrace';
import { Summary } from '../../../../../../shared/summary';
import { CompositeSpanDurationSummaryItem } from '../../../../../../shared/summary/composite_span_duration_summary_item';
import { DurationSummaryItem } from '../../../../../../shared/summary/duration_summary_item';
import { HttpInfoSummaryItem } from '../../../../../../shared/summary/http_info_summary_item';
import { TimestampTooltip } from '../../../../../../shared/timestamp_tooltip';
import { SyncBadge } from '../badge/sync_badge';
import { FailureBadge } from '../failure_badge';
import { ResponsiveFlyout } from '../responsive_flyout';
import { SpanLinksCount } from '../waterfall_helpers/waterfall_helpers';
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

const ContainerWithMarginRight = euiStyled.div`
  /* add margin to all direct descendants */
  & > * {
    margin-right: ${({ theme }) => theme.eui.euiSizeXS};
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
}: Props) {
  const { data = INITIAL_DATA, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/spans/{spanId}', {
        params: { path: { traceId, spanId }, query: { parentTransactionId } },
      });
    },
    [traceId, spanId, parentTransactionId]
  );

  const { span, parentTransaction } = data;

  const isLoading = isPending(status);

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} size="m" ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanDetailsTitle',
                    { defaultMessage: 'Span details' }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {span && (
              <EuiFlexItem grow={false}>
                <DiscoverSpanLink spanId={span.span.id}>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.viewSpanInDiscoverButtonLabel',
                    { defaultMessage: 'View span in Discover' }
                  )}
                </DiscoverSpanLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          {span?.span.composite && (
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiCallOut color="warning" iconType="gear" size="s">
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
          {isLoading && <EuiLoadingContent />}
          {span && (
            <SpanFlyoutBody
              span={span}
              parentTransaction={parentTransaction}
              totalDuration={totalDuration}
              spanLinksCount={spanLinksCount}
              flyoutDetailTab={flyoutDetailTab}
            />
          )}
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
  const codeLanguage = parentTransaction?.service.language?.name;
  const spanDb = span.span.db;
  const spanTypes = getSpanTypes(span);
  const spanHttpStatusCode =
    span.http?.response?.status_code || span.span?.http?.response?.status_code;
  const spanHttpUrl = span.url?.original || span.span?.http?.url?.original;
  const spanHttpMethod = span.http?.request?.method || span.span?.http?.method;

  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: span.trace.id,
    spanId: span.span.id,
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
          <SpanMetadata spanId={span.span.id} />
        </Fragment>
      ),
    },
    ...(!isEmpty(stackframes)
      ? [
          {
            id: 'stack-trace',
            name: i18n.translate(
              'xpack.apm.transactionDetails.spanFlyout.stackTraceTabLabel',
              {
                defaultMessage: 'Stack Trace',
              }
            ),
            content: (
              <Fragment>
                <EuiSpacer size="l" />
                <Stacktrace
                  stackframes={stackframes}
                  codeLanguage={codeLanguage}
                />
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
          <TimestampTooltip time={span.timestamp.us / 1000} />,
          <>
            <DurationSummaryItem
              duration={span.span.duration.us}
              totalDuration={totalDuration}
              parentType="transaction"
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
              content={i18n.translate(
                'xpack.apm.transactionDetails.spanFlyout.spanType',
                { defaultMessage: 'Type' }
              )}
            >
              <EuiBadge color="hollow">{spanTypes.spanType}</EuiBadge>
            </EuiToolTip>
            {spanTypes.spanSubtype && (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.transactionDetails.spanFlyout.spanSubtype',
                  { defaultMessage: 'Subtype' }
                )}
              >
                <EuiBadge color="hollow">{spanTypes.spanSubtype}</EuiBadge>
              </EuiToolTip>
            )}
            {spanTypes.spanAction && (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.transactionDetails.spanFlyout.spanAction',
                  { defaultMessage: 'Action' }
                )}
              >
                <EuiBadge color="hollow">{spanTypes.spanAction}</EuiBadge>
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
