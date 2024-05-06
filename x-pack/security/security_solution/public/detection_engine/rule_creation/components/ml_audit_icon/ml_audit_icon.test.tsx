/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MlAuditIcon } from './ml_audit_icon';

describe('MlAuditIcon', () => {
  it('should render null if message is undefined', () => {
    const { container } = render(<MlAuditIcon message={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render tooltip with message text when hover over the icon', async () => {
    render(<MlAuditIcon message={{ text: 'mock audit text' }} />);

    userEvent.hover(screen.getByTestId('mlJobAuditIcon'));

    expect(await screen.findByText('mock audit text')).toBeInTheDocument();
  });
});
