/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { get } from 'lodash/fp';
import * as React from 'react';

import moment = require('moment');
import { Body } from '.';
import { mockECSData } from '../../../mock';
import { headers } from './column_headers/headers';
import { columnRenderers, rowRenderers } from './renderers';

const testBodyHeight = 700;

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    test('it renders each column of data (NOTE: this test omits timestamp, which is a special case tested below)', () => {
      const headersSansTimestamp = headers.filter(h => h.id !== 'timestamp');

      const wrapper = mount(
        <Body
          id={'timeline-test'}
          columnHeaders={headersSansTimestamp}
          columnRenderers={columnRenderers}
          data={mockECSData}
          rowRenderers={rowRenderers}
          height={testBodyHeight}
          theme="dark"
        />
      );

      headersSansTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="dataDrivenColumns"]')
            .first()
            .text()
        ).toContain(get(h.id, mockECSData[0]));
      });
    });

    test('it renders a formatted timestamp', () => {
      const headersJustTimestamp = headers.filter(h => h.id === 'timestamp');

      const wrapper = mount(
        <Body
          id={'timeline-test'}
          columnHeaders={headersJustTimestamp}
          columnRenderers={columnRenderers}
          data={mockECSData}
          rowRenderers={rowRenderers}
          height={testBodyHeight}
          theme="dark"
        />
      );

      headersJustTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="dataDrivenColumns"]')
            .first()
            .text()
        ).toContain(moment(get(h.id, mockECSData[0])).format());
      });
    });
  });
});
