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
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle
} from '@elastic/eui';
import { get, keys } from 'lodash';
import React, { Fragment } from 'react';
import styled from 'styled-components';

import { SERVICE_LANGUAGE_NAME } from '../../../../../../../../common/constants';

import { DatabaseContext } from './DatabaseContext';
import { HttpContext } from './HttpContext';
import { StickySpanProperties } from './StickySpanProperties';

import { DiscoverSpanLink } from 'x-pack/plugins/apm/public/components/shared/Links/DiscoverLinks/DiscoverSpanLink';
import { Stacktrace } from 'x-pack/plugins/apm/public/components/shared/Stacktrace';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { Span } from '../../../../../../../../typings/es_schemas/Span';
import { FlyoutTopLevelProperties } from '../FlyoutTopLevelProperties';

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
              <DiscoverSpanLink span={span}>
                <EuiButtonEmpty iconType="discoverApp">
                  {`View span in Discover`}
                </EuiButtonEmpty>
              </DiscoverSpanLink>
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
                    <EuiSpacer size="l" />
                    <HttpContext httpContext={httpContext} />
                    <DatabaseContext dbContext={dbContext} />
                    <Stacktrace
                      stackframes={stackframes}
                      codeLanguage={codeLanguage}
                    />
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
                          name: '',
                          field: 'key',
                          render: (key: string) => <TagName>{key}</TagName>
                        },
                        {
                          name: '',
                          field: 'value'
                        }
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
