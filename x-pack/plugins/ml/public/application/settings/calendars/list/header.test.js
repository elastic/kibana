/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { CalendarsListHeader } from './header';

jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

describe('CalendarListsHeader', () => {
  const refreshCalendars = jest.fn(() => {});

  const requiredProps = {
    totalCount: 3,
    refreshCalendars,
    kibana: {
      services: {
        docLinks: {
          ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
          DOC_LINK_VERSION: 'jest-metadata-mock-branch',
        },
      },
    },
  };

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const component = shallowWithIntl(<CalendarsListHeader {...props} />);

    expect(component).toMatchSnapshot();
  });
});
