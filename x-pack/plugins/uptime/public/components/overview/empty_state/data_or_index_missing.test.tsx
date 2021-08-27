/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { FormattedMessage } from '@kbn/i18n/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { DataOrIndexMissing } from './data_or_index_missing';

describe('DataOrIndexMissing component', () => {
  it('renders headingMessage', () => {
    const headingMessage = (
      <FormattedMessage
        id="xpack.uptime.emptyState.noIndexTitle"
        defaultMessage="Uptime index {indexName} not found"
        values={{ indexName: <em>heartbeat-*</em> }}
      />
    );
    render(<DataOrIndexMissing headingMessage={headingMessage} />);
    expect(screen.getByText(/heartbeat-*/)).toBeInTheDocument();
  });
});
