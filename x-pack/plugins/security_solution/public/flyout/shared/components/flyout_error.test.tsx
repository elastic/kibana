/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FlyoutError } from './flyout_error';
import { ERROR_MESSAGE, ERROR_TITLE, FLYOUT_ERROR } from '../translations';
import { FLYOUT_ERROR_TEST_ID } from '../test_ids';

describe('<FlyoutError />', () => {
  it('should render error title and body', () => {
    const { getByTestId } = render(<FlyoutError />);
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toHaveTextContent(ERROR_TITLE(FLYOUT_ERROR));
    expect(getByTestId(FLYOUT_ERROR_TEST_ID)).toHaveTextContent(ERROR_MESSAGE(FLYOUT_ERROR));
  });
});
