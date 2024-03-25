/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { Readme } from './readme';

describe('Readme', () => {
  function render() {
    const refs = {
      current: {
        set: jest.fn(),
        get: jest.fn(),
      },
    } as any;
    const testRenderer = createIntegrationsTestRendererMock();
    return testRenderer.render(
      <Readme
        packageName="test"
        version="1.0.0"
        markdown="# Test ![Image](../img/image.png)>"
        refs={refs}
      />
    );
  }
  it('should render img tag with max width', () => {
    const result = render();

    const img = result.getByAltText('Image');

    expect(img).toHaveStyle('max-width: 100%');
    expect(img).toHaveAttribute('src', '/mock/api/fleet/epm/packages/test/1.0.0//img/image.png');
  });
});
