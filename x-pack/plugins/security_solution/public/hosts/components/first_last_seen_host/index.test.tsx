/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render as _render, waitFor } from '@testing-library/react';

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

  let render: (ui: React.ReactElement) => ReturnType<typeof _render>;

  beforeEach(() => {
    render = (ui: React.ReactElement): ReturnType<typeof _render> => {
      return _render(
        <TestProviders>
          <div data-test-subj="test-render-output">{ui}</div>
        </TestProviders>
      );
    };
  });

  test('Loading', async () => {
    useFirstLastSeenHostMock.mockReturnValue([true, MOCKED_RESPONSE]);
    const { getByTestId } = render(
      <FirstLastSeenHost
        docValueFields={[]}
        indexNames={[]}
        hostName="kibana-siem"
        type={FirstLastSeenHostType.FIRST_SEEN}
      />
    );

    // Removed strict equality as the EuiLoader has been converted to Emotion and will no longer have the euiLoadingSpinner--medium class
    expect(getByTestId('test-render-output').innerHTML).toContain('<span class="euiLoadingSpinner');
  });

  test('First Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([false, MOCKED_RESPONSE]);
    const { getByTestId } = render(
      <FirstLastSeenHost
        docValueFields={[]}
        indexNames={[]}
        hostName="kibana-siem"
        type={FirstLastSeenHostType.FIRST_SEEN}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-render-output').innerHTML).toBe(
        `<div class="euiText css-1vkrgyt-euiText-s"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
      );
    });
  });

  test('Last Seen', async () => {
    useFirstLastSeenHostMock.mockReturnValue([false, MOCKED_RESPONSE]);
    const { getByTestId } = render(
      <FirstLastSeenHost
        docValueFields={[]}
        indexNames={[]}
        hostName="kibana-siem"
        type={FirstLastSeenHostType.LAST_SEEN}
      />
    );
    await waitFor(() => {
      expect(getByTestId('test-render-output').innerHTML).toBe(
        `<div class="euiText css-1vkrgyt-euiText-s"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
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
    const { getByTestId } = render(
      <FirstLastSeenHost
        docValueFields={[]}
        indexNames={[]}
        hostName="kibana-siem"
        type={FirstLastSeenHostType.LAST_SEEN}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-render-output').innerHTML).toBe(
        `<div class="euiText css-1vkrgyt-euiText-s"><span class="euiToolTipAnchor">${lastSeen}</span></div>`
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
    const { getByTestId } = render(
      <FirstLastSeenHost
        docValueFields={[]}
        indexNames={[]}
        hostName="kibana-siem"
        type={FirstLastSeenHostType.FIRST_SEEN}
      />
    );

    await waitFor(() => {
      expect(getByTestId('test-render-output').innerHTML).toBe(
        `<div class="euiText css-1vkrgyt-euiText-s"><span class="euiToolTipAnchor">${firstSeen}</span></div>`
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
