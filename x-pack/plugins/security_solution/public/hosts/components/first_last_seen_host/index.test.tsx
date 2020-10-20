/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { render, waitFor } from '@testing-library/react';

import { useFirstLastSeenHost } from '../../containers/hosts/first_last_seen';
import { TestProviders } from '../../../common/mock';
import { FirstLastSeenHost, FirstLastSeenHostType } from '.';

const MOCKED_RESPONSE = {
  firstSeen: '2019-04-08T16:09:40.692Z',
  lastSeen: '2019-04-08T18:35:45.064Z',
};

jest.mock('../../containers/hosts/first_last_seen');
const useFirstLastSeenHostMock = useFirstLastSeenHost as jest.Mock;
useFirstLastSeenHostMock.mockReturnValue([false, MOCKED_RESPONSE]);

describe('FirstLastSeen Component', () => {
  const firstSeen = 'Apr 8, 2019 @ 16:09:40.692';
  const lastSeen = 'Apr 8, 2019 @ 18:35:45.064';

  test('Loading', async () => {
    useFirstLastSeenHostMock.mockReturnValue([true, MOCKED_RESPONSE]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.FIRST_SEEN}
        />
      </TestProviders>
    );
    expect(container.innerHTML).toBe(
      '<span class="euiLoadingSpinner euiLoadingSpinner--medium"></span>'
    );
  });

  test('First Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([false, MOCKED_RESPONSE]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.FIRST_SEEN}
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe(
        `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
      );
    });
  });

  test('Last Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([false, MOCKED_RESPONSE]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.LAST_SEEN}
        />
      </TestProviders>
    );
    await waitFor(() => {
      expect(container.innerHTML).toBe(
        `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
      );
    });
  });

  test('First Seen is empty but not Last Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        firstSeen: null,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.LAST_SEEN}
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe(
        `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
      );
    });
  });

  test('Last Seen is empty but not First Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        lastSeen: null,
      },
    ]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.FIRST_SEEN}
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe(
        `<div class="euiText euiText--small"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
      );
    });
  });

  test('First Seen With a bad date time string', async () => {
    useFirstLastSeenHostMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        firstSeen: 'something-invalid',
      },
    ]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.FIRST_SEEN}
        />
      </TestProviders>
    );
    await waitFor(() => {
      expect(container.textContent).toBe('something-invalid');
    });
  });

  test('Last Seen With a bad date time string', async () => {
    useFirstLastSeenHostMock.mockReturnValue([
      false,
      {
        ...MOCKED_RESPONSE,
        lastSeen: 'something-invalid',
      },
    ]);
    const { container } = render(
      <TestProviders>
        <FirstLastSeenHost
          docValueFields={[]}
          indexNames={[]}
          hostName="kibana-siem"
          type={FirstLastSeenHostType.LAST_SEEN}
        />
      </TestProviders>
    );
    await waitFor(() => {
      expect(container.textContent).toBe('something-invalid');
    });
  });
});
