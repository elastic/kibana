/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import { get } from 'lodash/fp';
import * as React from 'react';
import { ThemeProvider } from 'styled-components';

import moment = require('moment');
import { Body } from '.';
import { mockEcsData } from '../../../mock';
import { headers } from './column_headers/headers';
import { columnRenderers, rowRenderers } from './renderers';

const testBodyHeight = 700;

describe('ColumnHeaders', () => {
  describe('rendering', () => {
    test('it renders each column of data (NOTE: this test omits timestamp, which is a special case tested below)', () => {
      const headersSansTimestamp = headers.filter(h => h.id !== 'timestamp');

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <Body
            id={'timeline-test'}
            columnHeaders={headersSansTimestamp}
            columnRenderers={columnRenderers}
            data={mockEcsData}
            rowRenderers={rowRenderers}
            height={testBodyHeight}
          />
        </ThemeProvider>
      );

      headersSansTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="dataDrivenColumns"]')
            .first()
            .text()
        ).toContain(get(h.id, mockEcsData[0]));
      });
    });

    test('it renders a formatted timestamp', () => {
      const headersJustTimestamp = headers.filter(h => h.id === 'timestamp');

      const wrapper = mount(
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <Body
            id={'timeline-test'}
            columnHeaders={headersJustTimestamp}
            columnRenderers={columnRenderers}
            data={mockEcsData}
            rowRenderers={rowRenderers}
            height={testBodyHeight}
          />
        </ThemeProvider>
      );

      headersJustTimestamp.forEach(h => {
        expect(
          wrapper
            .find('[data-test-subj="dataDrivenColumns"]')
            .first()
            .text()
        ).toContain(moment(get(h.id, mockEcsData[0])).format());
      });
    });
  });
});
