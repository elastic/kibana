/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { Introduction } from './introduction';

jest.mock('../../../hooks/use_kibana_url', () => ({
  useKibanaUrl: (path: string) => `/base${path}`,
}));

function renderIntroduction(guideLink = 'https://example.com/guide') {
  return render(
    <MockAppHeaderProvider>
      <Introduction guideLink={guideLink} />
    </MockAppHeaderProvider>
  );
}

describe('Introduction', () => {
  it('renders the AppHeader with title "APM"', async () => {
    renderIntroduction();
    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('APM');
  });

  it('renders the description with a "Learn more" link', async () => {
    renderIntroduction('https://my-guide.com');
    const description = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.description);
    expect(description).toBeInTheDocument();
    const learnMore = screen.getByRole('link', { name: /learn more/i });
    expect(learnMore).toHaveAttribute('href', 'https://my-guide.com');
  });

  it('renders the preview image in the page body (not inside AppHeader)', async () => {
    renderIntroduction();
    const img = screen.getByRole('img', { name: /screenshot of primary dashboard/i });
    expect(img).toBeInTheDocument();
    // Image must be present but must NOT be a descendant of the AppHeader title region
    const header = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title);
    expect(header).not.toContainElement(img);
  });

  it('does not render a back button', async () => {
    renderIntroduction();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('does not render any beta badge', () => {
    renderIntroduction();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
