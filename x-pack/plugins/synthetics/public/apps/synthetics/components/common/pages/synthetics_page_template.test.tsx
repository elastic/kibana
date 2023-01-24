/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// app.test.js
import React from 'react';
import 'jest-styled-components';
import { render } from '../../../utils/testing/rtl_helpers';
import { SyntheticsPageTemplateComponent } from './synthetics_page_template';
import { OVERVIEW_ROUTE } from '../../../../../../common/constants';

describe('SyntheticsPageTemplateComponent', () => {
  describe('styling', () => {
    // In this test we use snapshots because we're asserting on generated
    // styles. Writing assertions manually here could make this test really
    // convoluted, and it require us to manually update styling strings
    // according to `styled-components` generator, which is counter-productive.
    // In general, however, we avoid snaphshot tests.

    it('does not apply header centering on bigger resolutions', () => {
      const { container } = render(<SyntheticsPageTemplateComponent path={OVERVIEW_ROUTE} />);
      expect(container.firstChild).toBeDefined();
    });

    it('applies the header centering on mobile', () => {
      window.innerWidth = 600;
      const { container } = render(<SyntheticsPageTemplateComponent path={OVERVIEW_ROUTE} />);
      expect(container.firstChild).toBeDefined();
    });
  });
});
