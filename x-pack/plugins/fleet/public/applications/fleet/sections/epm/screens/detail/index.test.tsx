/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTestRendererMock, TestRenderer } from '../../../../mock';
import { Detail } from './index';
import React from 'react';
import { pagePathGetters } from '../../../../constants';

describe('when on integration detail', () => {
  let testRenderer: TestRenderer;
  let renderResult: ReturnType<typeof testRenderer.render>;
  const render = () => (renderResult = testRenderer.render(<Detail />));

  beforeEach(() => {
    testRenderer = createTestRendererMock();
    testRenderer.history.push(pagePathGetters.integration_details({ pkgkey: 'ngnix' }));
  });

  describe('and a custom UI extension is NOT registered', () => {
    beforeEach(() => render());

    it('should not show a custom tab', () => {
      expect(renderResult.queryByTestId('tab-custom')).toBeNull();
    });

    it.todo('should redirect if custom url is accessed');
  });

  describe('and a custom UI extension is registered', () => {
    it.todo('should display "custom" tab in navigation');

    it.todo('should display custom content when tab is clicked');
  });
});
