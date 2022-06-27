/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { Indicator } from '../indicators_flyout/indicators_flyout';

export const FlyoutJson: VFC<{ indicator: Indicator }> = ({ indicator }) => {
  return Object.keys(indicator).length === 0 ? (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={<h2>Unable to display indicator information</h2>}
      body={<p>There was an error displaying the indicator fields and values.</p>}
      data-test-subj={'tiFlyoutJsonEmptyPrompt'}
    />
  ) : (
    <EuiCodeBlock language="json" lineNumbers data-test-subj={'tiFlyoutJsonCodeBlock'}>
      {JSON.stringify(indicator, null, 2)}
    </EuiCodeBlock>
  );
};
