/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { ApmIndices } from '.';
import * as hooks from '../../../../hooks/useFetcher';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';

describe('ApmIndices', () => {
  it('should not get stuck in infinite loop', () => {
    const spy = jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: undefined,
      status: hooks.FETCH_STATUS.LOADING,
      refetch: jest.fn(),
    });
    const { getByText } = render(
      <MockApmPluginContextWrapper>
        <ApmIndices />
      </MockApmPluginContextWrapper>
    );

    expect(getByText('Indices')).toMatchInlineSnapshot(`
      <h2
        class="euiTitle euiTitle--medium"
      >
        Indices
      </h2>
    `);

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
