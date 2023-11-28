/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Output } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';
import { useFleetStatus } from '../../../../../../hooks/use_fleet_status';
import { ExperimentalFeaturesService } from '../../../../../../services';
import { useStartServices } from '../../../../hooks';

import { EditOutputFlyout } from '.';

// mock yaml code editor
jest.mock('@kbn/kibana-react-plugin/public/code_editor', () => ({
  CodeEditor: () => <>CODE EDITOR</>,
}));
jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useBreadcrumbs: jest.fn(),
    useStartServices: jest.fn(),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

const mockedUsedFleetStatus = useFleetStatus as jest.MockedFunction<typeof useFleetStatus>;

function renderFlyout(output?: Output) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <EditOutputFlyout proxies={[]} output={output} onClose={() => {}} />
  );

  return { utils };
}

const logstashInputsLabels = [
  'Client SSL certificate key',
  'Client SSL certificate',
  'Server SSL certificate authorities (optional)',
];

const kafkaInputsLabels = [
  'Partitioning strategy',
  'Number of events',
  'Default topic',
  'Key',
  'Value',
  'Broker timeout',
  'Broker reachability timeout',
  'ACK Reliability',
  'Key (optional)',
];

const kafkaSectionsLabels = [
  'Authentication',
  'Partitioning',
  'Topics',
  'Headers',
  'Compression',
  'Broker settings',
];

const remoteEsOutputLabels = ['Hosts', 'Service Token'];

describe('EditOutputFlyout', () => {
  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockReturnValue({
      notifications: { toasts: {} },
      docLinks: {
        links: { fleet: {}, logstash: {}, kibana: {} },
      },
      cloud: {
        isServerlessEnabled,
      },
    });
  };

  beforeEach(() => {
    mockStartServices(false);
  });

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
    logstashInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    // Does not show kafka inputs nor sections
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).toBeNull();
    });
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
    logstashInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });

    // Does not show kafka inputs nor sections
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).toBeNull();
    });
  });

  it('should render the flyout if the output provided is a kafka output', async () => {
    const { utils } = renderFlyout({
      type: 'kafka',
      name: 'kafka output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show kafka inputs
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).not.toBeNull();
    });

    // Does not show logstash inputs
    ['Client SSL certificate key', 'Client SSL certificate'].forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });
  });

  it('should show a callout in the flyout if the selected output is logstash and no encrypted key is set', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      missingOptionalFeatures: ['encrypted_saved_object_encryption_key_required'],
    } as any);
    const { utils } = renderFlyout({
      type: 'logstash',
      name: 'logstash output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show logstash SSL inputs
    expect(utils.getByText('Additional setup required')).not.toBeNull();
  });

  it('should render the flyout if the output provided is a remote ES output', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({ remoteESOutput: true });
    const { utils } = renderFlyout({
      type: 'remote_elasticsearch',
      name: 'remote es output',
      id: 'outputR',
      is_default: false,
      is_default_monitoring: false,
    });

    remoteEsOutputLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });
    expect(utils.queryByTestId('serviceTokenCallout')).not.toBeNull();

    expect(utils.queryByTestId('settingsOutputsFlyout.typeInput')?.textContent).toContain(
      'Remote Elasticsearch'
    );
  });

  it('should not display remote ES output in type lists if serverless', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({ remoteESOutput: true });
    mockUseStartServices.mockReset();
    mockStartServices(true);
    const { utils } = renderFlyout({
      type: 'elasticsearch',
      name: 'dummy',
      id: 'output',
      is_default: false,
      is_default_monitoring: false,
    });

    expect(utils.queryByTestId('settingsOutputsFlyout.typeInput')?.textContent).not.toContain(
      'Remote Elasticsearch'
    );
  });
});
