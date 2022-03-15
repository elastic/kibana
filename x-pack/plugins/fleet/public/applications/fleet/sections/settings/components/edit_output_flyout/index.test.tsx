/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Output } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { EditOutputFlyout } from '.';

// mock yaml code editor
jest.mock('../../../../../../../../../../src/plugins/kibana_react/public/code_editor', () => ({
  CodeEditor: () => <>CODE EDITOR</>,
}));
jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
}));

function renderFlyout(output?: Output) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<EditOutputFlyout output={output} onClose={() => {}} />);

  return { utils };
}
describe('EditOutputFlyout', () => {
  it('should render the flyout if there is not output provided', async () => {
    renderFlyout();
  });

  it('should render the flyout if the output provided is a ES output', async () => {
    const { utils } = renderFlyout({
      type: 'elasticsearch',
      name: 'elasticsearch output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    expect(
      utils.queryByLabelText('Elasticsearch CA trusted fingerprint (optional)')
    ).not.toBeNull();
    // Does not show logstash SSL inputs
    expect(utils.queryByLabelText('Client SSL certificate key')).toBeNull();
    expect(utils.queryByLabelText('Client SSL certificate')).toBeNull();
    expect(utils.queryByLabelText('Server SSL certificate authorities')).toBeNull();
  });

  it('should render the flyout if the output provided is a logstash output', async () => {
    const { utils } = renderFlyout({
      type: 'logstash',
      name: 'logstash output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show logstash SSL inputs
    expect(utils.queryByLabelText('Client SSL certificate key')).not.toBeNull();
    expect(utils.queryByLabelText('Client SSL certificate')).not.toBeNull();
    expect(utils.queryByLabelText('Server SSL certificate authorities')).not.toBeNull();
  });
});
