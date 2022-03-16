/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartEmptyState } from './chart_empty_state';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

describe('ChartEmptyState', () => {
  it('renders string values', () => {
    expect(
      shallowWithIntl(<ChartEmptyState body="This is the body" title="This is the title" />)
    ).toMatchSnapshot();
  });

  it('renders JSX values', () => {
    expect(
      shallowWithIntl(
        <ChartEmptyState
          body={
            <FormattedMessage
              id="test.body"
              defaultMessage="This is the default with a {val} included"
              values={{ val: <strong>down</strong> }}
            />
          }
          title={<FormattedMessage id="test.title" defaultMessage="The title" />}
        />
      )
    ).toMatchSnapshot();
  });
});
