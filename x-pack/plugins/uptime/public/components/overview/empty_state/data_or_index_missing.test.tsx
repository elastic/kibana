/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataOrIndexMissing } from './data_or_index_missing';

describe('DataOrIndexMissing component', () => {
  it('renders headingMessage', () => {
    const headingMessage = (
      <FormattedMessage
        id="xpack.uptime.emptyState.noIndexTitle"
        defaultMessage="Uptime index {indexName} not found"
        values={{ indexName: <em>heartbeat-*</em> }}
      />
    );
    const component = shallowWithIntl(<DataOrIndexMissing headingMessage={headingMessage} />);
    expect(component).toMatchSnapshot();
  });
});
