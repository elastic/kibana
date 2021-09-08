/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
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
import { CompositeSpanDurationSummaryItem } from '../../../../../../shared/Summary/CompositeSpanDurationSummaryItem';
import { euiStyled } from '../../../../../../../../../../../src/plugins/kibana_react/common';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { DiscoverSpanLink } from '../../../../../../shared/Links/DiscoverLinks/DiscoverSpanLink';
import { SpanMetadata } from '../../../../../../shared/MetadataTable/SpanMetadata';
import { Stacktrace } from '../../../../../../shared/Stacktrace';
import { Summary } from '../../../../../../shared/Summary';
import { DurationSummaryItem } from '../../../../../../shared/Summary/DurationSummaryItem';
import { HttpInfoSummaryItem } from '../../../../../../shared/Summary/http_info_summary_item';
import { TimestampTooltip } from '../../../../../../shared/TimestampTooltip';
import { ResponsiveFlyout } from '../ResponsiveFlyout';
import { SyncBadge } from '../sync_badge';
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
  const httpContext = span.span.http;
  const spanTypes = getSpanTypes(span);
  const spanHttpStatusCode = httpContext?.response?.status_code;
  const spanHttpUrl = httpContext?.url?.original;
  const spanHttpMethod = httpContext?.method;

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
                <EuiButtonEmpty iconType="discoverApp">
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.viewSpanInDiscoverButtonLabel',
                    {
                      defaultMessage: 'View span in Discover',
                    }
                  )}
                </EuiButtonEmpty>
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

                <SyncBadge sync={span.span.sync} />
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
