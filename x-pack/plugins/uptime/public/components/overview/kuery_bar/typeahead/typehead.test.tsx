/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { Typeahead } from './typehead';
import { render } from '../../../../lib/helper/rtl_helpers';

describe('Type head', () => {
  it('it renders all tabs', () => {
    const { getByText } = render(
      <Typeahead
        ariaLabel={'Search for data'}
        dataTestSubj={'kueryBar'}
        disabled={false}
        isLoading={false}
        initialValue={''}
        onChange={() => {}}
        onSubmit={() => {}}
        suggestions={[]}
        loadMore={() => {}}
        queryExample=""
      />
    );
    expect(getByText('Overview')).toBeInTheDocument();
    expect(getByText('Certificates')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
  });

  it('it keep params while switching', () => {
    const { getByTestId } = render(<Typeahead />, {
      history: createMemoryHistory({
        initialEntries: ['/settings/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
      }),
    });
    expect(getByTestId('uptimeSettingsToOverviewLink')).toHaveAttribute(
      'href',
      '/?dateRangeStart=now-10m'
    );
    expect(getByTestId('uptimeCertificatesLink')).toHaveAttribute(
      'href',
      '/certificates?dateRangeStart=now-10m'
    );
    expect(getByTestId('settings-page-link')).toHaveAttribute(
      'href',
      '/settings?dateRangeStart=now-10m'
    );
  });
});
