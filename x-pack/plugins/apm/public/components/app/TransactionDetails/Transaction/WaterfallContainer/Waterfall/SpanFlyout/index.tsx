/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  // @ts-ignore otherwise TS complains "Module ''@elastic/eui'' has no exported member 'EuiTabbedContent'"
  EuiTabbedContent,
  EuiTitle
} from '@elastic/eui';
import { get, keys } from 'lodash';
import React, { Fragment } from 'react';
import styled from 'styled-components';

// @ts-ignore
import {
  SERVICE_LANGUAGE_NAME,
  SPAN_HEX_ID,
  SPAN_ID
} from '../../../../../../../../common/constants';
import { px, unit } from '../../../../../../../style/variables';

// @ts-ignore
import { Stacktrace } from '../../../../../../shared/Stacktrace';

import { DatabaseContext } from './DatabaseContext';
import { HttpContext } from './HttpContext';
import { StickySpanProperties } from './StickySpanProperties';

import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';
import { Span } from '../../../../../../../../typings/Span';
import { DiscoverButton } from '../../../../../../shared/DiscoverButton';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';

const StackTraceContainer = styled.div`
  margin-top: ${px(unit)};
`;

const TagName = styled.div`
  font-weight: bold;
`;

function getDiscoverQuery(span: Span) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query:
          span.version === 'v2'
            ? `${SPAN_HEX_ID}:"${span.span.hex_id}"`
            : `${SPAN_ID}:"${span.span.id}"`
      }
    }
  };
}

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
  onClose
}: Props) {
  if (!span) {
    return null;
  }
  const stackframes = span.span.stacktrace;
  const codeLanguage: string = get(span, SERVICE_LANGUAGE_NAME);
  const dbContext = span.context.db;
  const httpContext = span.context.http;
  const tagContext = span.context.tags;
  const tags = keys(tagContext).map(key => ({
    key,
    value: get(tagContext, key)
  }));

  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} size="m" ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>Span details</h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DiscoverButton query={getDiscoverQuery(span)}>
                {`View span in Discover`}
              </DiscoverButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <FlyoutTopLevelProperties transaction={parentTransaction} />
          <EuiHorizontalRule />
          <StickySpanProperties span={span} totalDuration={totalDuration} />
          <EuiHorizontalRule />
          <EuiTabbedContent
            tabs={[
              {
                id: 'stack-trace',
                name: 'Stack Trace',
                content: (
                  <Fragment>
                    <HttpContext httpContext={httpContext} />
                    <DatabaseContext dbContext={dbContext} />
                    <StackTraceContainer>
                      <Stacktrace
                        stackframes={stackframes}
                        codeLanguage={codeLanguage}
                      />
                    </StackTraceContainer>
                  </Fragment>
                )
              },
              {
                id: 'tags',
                name: 'Tags',
                content: (
                  <Fragment>
                    <EuiBasicTable
                      columns={[
                        {
                          field: 'key',
                          render: (key: string) => <TagName>{key}</TagName>
                        },
                        { field: 'value' }
                      ]}
                      items={tags}
                    />
                  </Fragment>
                )
              }
            ]}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
