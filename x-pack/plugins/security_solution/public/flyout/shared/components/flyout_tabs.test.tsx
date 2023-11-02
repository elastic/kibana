/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiTab } from '@elastic/eui';
import { FlyoutTabs } from './flyout_tabs';

const tab = 'tab name';
const dataTestSubj = 'flyout tabs';

describe('<FlyoutTabs />', () => {
  it('should render tabs', () => {
    const { getByTestId } = render(
      <FlyoutTabs data-test-subj={dataTestSubj}>{[<EuiTab key={1}>{tab}</EuiTab>]}</FlyoutTabs>
    );
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(tab);
  });
});
