/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import { QUERY_TESTER_TITLE } from './i18n';
import { QueryTester } from './query_tester';

interface Props {
  onClose: () => void;
}

export const QueryTesterFlyout: React.FC<Props> = ({ onClose }) => {
  return (
    <EuiFlyout onClose={onClose} aria-labelledby="queryTesterFlyoutTitle" ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="queryTesterFlyoutTitle">{QUERY_TESTER_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <QueryTester />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
