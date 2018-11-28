/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiTitle
} from '@elastic/eui';
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';

// @ts-ignore
import {
  SERVICE_LANGUAGE_NAME,
  SPAN_HEX_ID,
  SPAN_ID
} from '../../../../../../../../common/constants';
import { px, unit } from '../../../../../../../style/variables';

// @ts-ignore
import Stacktrace from '../../../../../../shared/Stacktrace';

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
          <HttpContext httpContext={httpContext} />
          <DatabaseContext dbContext={dbContext} />
          <StackTraceContainer>
            <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
          </StackTraceContainer>
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
