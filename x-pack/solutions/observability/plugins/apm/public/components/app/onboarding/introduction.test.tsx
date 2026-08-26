/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { Introduction } from './introduction';

jest.mock('../../../hooks/use_kibana_url', () => ({
  useKibanaUrl: (path: string) => `/base${path}`,
}));

function renderIntroduction(guideLink = 'https://example.com/guide') {
  return render(
    <I18nProvider>
      <MockAppHeaderProvider>
        <Introduction guideLink={guideLink} />
      </MockAppHeaderProvider>
    </I18nProvider>
  );
}

describe('Introduction', () => {
  it('renders the AppHeader with title "APM"', async () => {
    renderIntroduction();
    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('APM');
  });

  it('renders the description with a "Learn more" link', () => {
    renderIntroduction('https://my-guide.com');
    const learnMore = screen.getByTestId('apmIntroductionLearnMoreLink');
    expect(learnMore).toHaveAttribute('href', 'https://my-guide.com');
    expect(learnMore).toHaveAccessibleName(/learn more about apm/i);
  });

  it('renders the preview image', () => {
    renderIntroduction();
    const img = screen.getByRole('img', { name: /screenshot of primary dashboard/i });
    expect(img).toBeInTheDocument();
  });

  it('does not render a back button', () => {
    renderIntroduction();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();
  });

  it('does not render any beta badge', () => {
    renderIntroduction();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
