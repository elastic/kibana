/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTab } from '@elastic/eui';
import { render } from '@testing-library/react';
import React from 'react';
import { FlyoutHeaderTabs } from './flyout_header_tabs';

const tab = 'tab name';
const dataTestSubj = 'flyout tabs';

describe('<FlyoutTabs />', () => {
  it('should render tabs', () => {
    const { getByTestId } = render(
      <FlyoutHeaderTabs data-test-subj={dataTestSubj}>
        {[<EuiTab key={1}>{tab}</EuiTab>]}
      </FlyoutHeaderTabs>
    );
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(tab);
  });
});
