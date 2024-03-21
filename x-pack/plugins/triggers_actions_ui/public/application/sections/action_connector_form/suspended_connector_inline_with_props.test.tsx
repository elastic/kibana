/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { suspendedConnectorInlineWithProps } from './suspended_connector_inline_with_props';

describe('suspendedConnectorInlineWithProps', () => {
  it('renders the component correctly', async () => {
    const Component = suspendedConnectorInlineWithProps(() => <div>{'My component'}</div>);
    // @ts-expect-error: props are irrelevant
    render(<Component />);

    expect(await screen.findByText('My component')).toBeInTheDocument();
  });
});
