/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';

import { CrawlerDomainValidationStepState } from '../../../../../api/crawler/types';

export const ValidationStateIcon: React.FC<{ state: CrawlerDomainValidationStepState }> = ({
  state,
}) => {
  switch (state) {
    case 'valid':
      return <EuiIcon color="success" type="check" />;
    case 'warning':
      return <EuiIcon color="warning" type="alert" />;
    case 'invalid':
      return <EuiIcon color="danger" type="cross" />;
    default:
      return <EuiLoadingSpinner />;
  }
};
