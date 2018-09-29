/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle
} from '@elastic/eui';
import { get } from 'lodash';
import React from 'react';
import styled from 'styled-components';

// @ts-ignore
import { SERVICE_LANGUAGE_NAME } from '../../../../../../../../common/constants';
import { px, unit } from '../../../../../../../style/variables';

// @ts-ignore
import Stacktrace from '../../../../../../shared/Stacktrace';

import { DatabaseContext } from './DatabaseContext';
import { StickySpanProperties } from './StickySpanProperties';

import { Span } from '../../../../../../../../typings/Span';
// @ts-ignore
import DiscoverButton from '../../../../../../shared/DiscoverButton';

const StackTraceContainer = styled.div`
  margin-top: ${px(unit)};
`;

function getDiscoverQuery(id: number) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `span.hex_id:${id}`
      }
    }
  };
}

interface Props {
  span?: Span;
  totalDuration: number;
  onClose: () => void;
}

export function SpanFlyout({ span, totalDuration, onClose }: Props) {
  if (!span) {
    return null;
  }
  const stackframes = span.span.stacktrace;
  const codeLanguage = get(span, SERVICE_LANGUAGE_NAME);
  const dbContext = span.context.db;

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>Span details</h2>
        </EuiTitle>

        <DiscoverButton query={getDiscoverQuery(span.span.id)}>
          {`View span in Discover`}
        </DiscoverButton>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <StickySpanProperties span={span} totalDuration={totalDuration} />
        <DatabaseContext dbContext={dbContext} />
        <StackTraceContainer>
          <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
        </StackTraceContainer>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
