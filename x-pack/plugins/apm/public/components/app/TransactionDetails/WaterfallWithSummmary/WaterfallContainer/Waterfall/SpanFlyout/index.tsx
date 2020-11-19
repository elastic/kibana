/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../../style/variables';
import { Summary } from '../../../../../../shared/Summary';
import { TimestampTooltip } from '../../../../../../shared/TimestampTooltip';
import { DurationSummaryItem } from '../../../../../../shared/Summary/DurationSummaryItem';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { DiscoverSpanLink } from '../../../../../../shared/Links/DiscoverLinks/DiscoverSpanLink';
import { Stacktrace } from '../../../../../../shared/Stacktrace';
import { ResponsiveFlyout } from '../ResponsiveFlyout';
import { DatabaseContext } from './DatabaseContext';
import { StickySpanProperties } from './StickySpanProperties';
import { HttpInfoSummaryItem } from '../../../../../../shared/Summary/HttpInfoSummaryItem';
import { SpanMetadata } from '../../../../../../shared/MetadataTable/SpanMetadata';
import { SyncBadge } from '../SyncBadge';

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

const SpanBadge = (styled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
` as unknown) as typeof EuiBadge;

const HttpInfoContainer = styled('div')`
  margin-right: ${px(units.quarter)};
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
  const dbContext = span.span.db;
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
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <StickySpanProperties span={span} transaction={parentTransaction} />
          <EuiSpacer size="m" />
          <Summary
            items={[
              <TimestampTooltip time={span.timestamp.us / 1000} />,
              <DurationSummaryItem
                duration={span.span.duration.us}
                totalDuration={totalDuration}
                parentType="transaction"
              />,
              <>
                {spanHttpUrl && (
                  <HttpInfoContainer>
                    <HttpInfoSummaryItem
                      method={spanHttpMethod}
                      url={spanHttpUrl}
                      status={spanHttpStatusCode}
                    />
                  </HttpInfoContainer>
                )}
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanType',
                    { defaultMessage: 'Type' }
                  )}
                >
                  <SpanBadge color="hollow">{spanTypes.spanType}</SpanBadge>
                </EuiToolTip>
                {spanTypes.spanSubtype && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanSubtype',
                      { defaultMessage: 'Subtype' }
                    )}
                  >
                    <SpanBadge color="hollow">
                      {spanTypes.spanSubtype}
                    </SpanBadge>
                  </EuiToolTip>
                )}
                {spanTypes.spanAction && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanAction',
                      { defaultMessage: 'Action' }
                    )}
                  >
                    <SpanBadge color="hollow">{spanTypes.spanAction}</SpanBadge>
                  </EuiToolTip>
                )}
                <SyncBadge sync={span.span.sync} />
              </>,
            ]}
          />
          <EuiHorizontalRule />
          <DatabaseContext dbContext={dbContext} />
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
