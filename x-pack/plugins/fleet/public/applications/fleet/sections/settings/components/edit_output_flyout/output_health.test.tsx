/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import type { Output } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendGetOutputHealth, useStartServices } from '../../../../hooks';

import { OutputHealth } from './output_health';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useStartServices: jest.fn(),
    sendGetOutputHealth: jest.fn(),
  };
});

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiToolTip: (props: any) => (
      <div data-test-subj="outputHealthBadgeTooltip" data-tooltip-content={props.content}>
        {props.children}
      </div>
    ),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

const mockSendGetOutputHealth = sendGetOutputHealth as jest.Mock;

describe('OutputHealth', () => {
  function render(output: Output, showBadge?: boolean) {
    const renderer = createFleetTestRendererMock();

    const utils = renderer.render(<OutputHealth output={output} showBadge={showBadge} />);

    return { utils };
  }

  const mockStartServices = () => {
    mockUseStartServices.mockReturnValue({
      notifications: { toasts: {} },
    });
  };

  beforeEach(() => {
    mockStartServices();
  });

  it('should render output health component when degraded', async () => {
    mockSendGetOutputHealth.mockResolvedValue({
      data: { state: 'DEGRADED', message: 'connection error', timestamp: '2023-11-30T14:25:31Z' },
    });
    const { utils } = render({
      type: 'remote_elasticsearch',
      id: 'remote',
      name: 'Remote ES',
      hosts: ['https://remote-es:443'],
    } as Output);

    expect(mockSendGetOutputHealth).toHaveBeenCalled();

    await waitFor(async () => {
      expect(utils.getByTestId('outputHealthDegradedCallout').textContent).toContain(
        'Unable to connect to "Remote ES" at https://remote-es:443.Please check the details are correct.'
      );
    });
  });

  it('should render output health component when healthy', async () => {
    mockSendGetOutputHealth.mockResolvedValue({
      data: { state: 'HEALTHY', message: '', timestamp: '2023-11-30T14:25:31Z' },
    });
    const { utils } = render({
      type: 'remote_elasticsearch',
      id: 'remote',
      name: 'Remote ES',
      hosts: ['https://remote-es:443'],
    } as Output);

    expect(mockSendGetOutputHealth).toHaveBeenCalled();

    await waitFor(async () => {
      expect(utils.getByTestId('outputHealthHealthyCallout').textContent).toContain(
        'Connection with remote output established.'
      );
    });
  });

  it('should render output health badge when degraded', async () => {
    mockSendGetOutputHealth.mockResolvedValue({
      data: { state: 'DEGRADED', message: 'connection error', timestamp: '2023-11-30T14:25:31Z' },
    });
    const { utils } = render(
      {
        type: 'remote_elasticsearch',
        id: 'remote',
        name: 'Remote ES',
        hosts: ['https://remote-es:443'],
      } as Output,
      true
    );

    expect(mockSendGetOutputHealth).toHaveBeenCalled();

    await waitFor(async () => {
      expect(utils.getByTestId('outputHealthDegradedBadge')).not.toBeNull();
      expect(utils.getByTestId('outputHealthBadgeTooltip')).not.toBeNull();
    });
  });

  it('should render output health badge when healthy', async () => {
    mockSendGetOutputHealth.mockResolvedValue({
      data: { state: 'HEALTHY', message: '', timestamp: '2023-11-30T14:25:31Z' },
    });
    const { utils } = render(
      {
        type: 'remote_elasticsearch',
        id: 'remote',
        name: 'Remote ES',
        hosts: ['https://remote-es:443'],
      } as Output,
      true
    );

    expect(mockSendGetOutputHealth).toHaveBeenCalled();

    await waitFor(async () => {
      expect(utils.getByTestId('outputHealthHealthyBadge')).not.toBeNull();
      expect(utils.getByTestId('outputHealthBadgeTooltip')).not.toBeNull();
    });
  });
});
