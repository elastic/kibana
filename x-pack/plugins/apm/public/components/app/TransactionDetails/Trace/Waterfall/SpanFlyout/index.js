/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle
} from '@elastic/eui';
import styled from 'styled-components';
import { get } from 'lodash';
import Stacktrace from '../../../../../shared/Stacktrace';
import { SERVICE_LANGUAGE_NAME } from '../../../../../../../common/constants';
import { unit, px } from '../../../../../../style/variables';

import DatabaseContext from './DatabaseContext';
import StickyProperties from './StickyProperties';

import DiscoverButton from '../../../../../shared/DiscoverButton';

const StackTraceContainer = styled.div`
  margin-top: ${px(unit)};
`;

function getDiscoverQuery(spanDocId) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `_id:${spanDocId}`
      }
    }
  };
}

export default function SpanFlyout({ span, totalDuration, onClose, isOpen }) {
  if (!isOpen) {
    return null;
  }
  const stackframes = span.span.stacktrace;
  const codeLanguage = get(span, SERVICE_LANGUAGE_NAME);
  const dbContext = get(span, 'context.db');

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>Span details</h2>
        </EuiTitle>

        <DiscoverButton query={getDiscoverQuery(span.docId)}>
          {`View span in Discover`}
        </DiscoverButton>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <StickyProperties span={span} totalDuration={totalDuration} />
        <DatabaseContext dbContext={dbContext} />
        <StackTraceContainer>
          <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
        </StackTraceContainer>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

SpanFlyout.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  span: PropTypes.object.isRequired
};
