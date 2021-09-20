/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';

import { QUERY_TESTER_TITLE } from './i18n';

import { QueryTesterFlyout } from '.';

export const QueryTesterButton: React.FC = () => {
  const [isQueryTesterOpen, setIsQueryTesterOpen] = useState(false);
  return (
    <>
      <EuiButtonEmpty
        iconType="beaker"
        size="s"
        onClick={() => setIsQueryTesterOpen(!isQueryTesterOpen)}
      >
        {QUERY_TESTER_TITLE}
      </EuiButtonEmpty>
      {isQueryTesterOpen && <QueryTesterFlyout onClose={() => setIsQueryTesterOpen(false)} />}
    </>
  );
};
