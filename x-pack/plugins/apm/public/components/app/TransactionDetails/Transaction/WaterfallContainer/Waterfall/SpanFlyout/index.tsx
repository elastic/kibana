/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiButtonEmpty,
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

import { SERVICE_LANGUAGE_NAME } from '../../../../../../../../common/constants';
import { px, unit } from '../../../../../../../style/variables';

import { DatabaseContext } from './DatabaseContext';
import { HttpContext } from './HttpContext';
import { StickySpanProperties } from './StickySpanProperties';

import { DiscoverSpanButton } from 'x-pack/plugins/apm/public/components/shared/DiscoverButtons/DiscoverSpanButton';
import { Stacktrace } from 'x-pack/plugins/apm/public/components/shared/Stacktrace';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { Span } from '../../../../../../../../typings/es_schemas/Span';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';

const StackTraceContainer = styled.div`
  margin-top: ${px(unit)};
`;

const TagName = styled.div`
  font-weight: bold;
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
              <DiscoverSpanButton span={span}>
                <EuiButtonEmpty iconType="discoverApp">
                  {`View span in Discover`}
                </EuiButtonEmpty>
              </DiscoverSpanButton>
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
