/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import React, { ReactNode } from 'react';
import { SettingsTemplate } from './settings_template';
import { createMemoryHistory } from 'history';
import { MemoryRouter, RouteComponentProps } from 'react-router-dom';
import { CoreStart, DocLinksStart, HttpStart } from 'kibana/public';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';
import { createCallApmApi } from '../../../services/rest/createCallApmApi';

import * as stories from './settings_template.stories';
import { composeStories } from '@storybook/testing-react';

const { Example } = composeStories(stories);

describe('Settings', () => {
  it('renders', async () => {
    render(<Example />);

    expect(await screen.findByText('hello world')).toBeInTheDocument();
  });
});
