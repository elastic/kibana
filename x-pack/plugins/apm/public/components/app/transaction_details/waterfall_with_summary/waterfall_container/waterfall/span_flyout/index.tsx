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
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { CompositeSpanDurationSummaryItem } from '../../../../../../shared/summary/composite_span_duration_summary_item';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { DiscoverSpanLink } from '../../../../../../shared/links/discover_links/discover_span_link';
import { SpanMetadata } from '../../../../../../shared/metadata_table/span_metadata';
import { Stacktrace } from '../../../../../../shared/stacktrace';
import { Summary } from '../../../../../../shared/summary';
import { DurationSummaryItem } from '../../../../../../shared/summary/duration_summary_item';
import { HttpInfoSummaryItem } from '../../../../../../shared/summary/http_info_summary_item';
import { TimestampTooltip } from '../../../../../../shared/timestamp_tooltip';
import { ResponsiveFlyout } from '../responsive_flyout';
import { SyncBadge } from '../badge/sync_badge';
import { SpanDatabase } from './span_db';
import { StickySpanProperties } from './sticky_span_properties';
import { FailureBadge } from '../failure_badge';

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
  span?: Span;
  parentTransaction?: Transaction;
  totalDuration?: number;
  onClose: () => void;
}

export function SpanFlyout({
  span,
  parentTransaction,
  totalDuration,
  onClose,
}: Props) {
  if (!span) {
    return null;
  }

  const stackframes = span.span.stacktrace;
  const codeLanguage = parentTransaction?.service.language?.name;
  const spanDb = span.span.db;
  const spanTypes = getSpanTypes(span);
  const spanHttpStatusCode =
    span.http?.response?.status_code || span.span?.http?.response?.status_code;
  const spanHttpUrl = span.url?.original || span.span?.http?.url?.original;
  const spanHttpMethod = span.http?.request?.method || span.span?.http?.method;

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
                    {
                      defaultMessage: 'Span details',
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DiscoverSpanLink span={span}>
                {i18n.translate(
                  'xpack.apm.transactionDetails.spanFlyout.viewSpanInDiscoverButtonLabel',
                  {
                    defaultMessage: 'View span in Discover',
                  }
                )}
              </DiscoverSpanLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          {span.span.composite && (
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
          <EuiTabbedContent
            tabs={[
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
              {
                id: 'metadata',
                name: i18n.translate(
                  'xpack.apm.propertiesTable.tabs.metadataLabel',
                  {
                    defaultMessage: 'Metadata',
                  }
                ),
                content: (
                  <Fragment>
                    <EuiSpacer size="m" />
                    <SpanMetadata span={span} />
                  </Fragment>
                ),
              },
            ]}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
