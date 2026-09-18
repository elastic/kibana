/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { MaxGroupsMessage } from './max_groups_message';

describe('MaxGroupsMessage', () => {
  it('resolves the troubleshooting docs link through the doc links service', () => {
    render(
      <MockApmPluginContextWrapper>
        <MaxGroupsMessage />
      </MockApmPluginContextWrapper>
    );

    expect(screen.getByTestId('apmMaxGroupsMessageDocsLink')).toHaveAttribute(
      'href',
      mockApmPluginContextValue.core.docLinks.links.apm.troubleshootingTooManyTransactions
    );
  });
});
