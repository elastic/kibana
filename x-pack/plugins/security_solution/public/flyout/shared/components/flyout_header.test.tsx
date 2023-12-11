/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutHeader } from './flyout_header';

const text = 'some text';
const dataTestSubj = 'flyout header';

describe('<FlyoutHeader />', () => {
  it('should render header', () => {
    const { getByTestId } = render(
      <FlyoutHeader data-test-subj={dataTestSubj}>{text}</FlyoutHeader>
    );
    expect(getByTestId(dataTestSubj)).toBeInTheDocument();
    expect(getByTestId(dataTestSubj)).toHaveTextContent(text);
  });
});
