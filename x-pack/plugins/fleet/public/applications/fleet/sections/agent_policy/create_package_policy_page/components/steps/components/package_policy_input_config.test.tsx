/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../../../mock';

import { PackagePolicyInputConfig } from './package_policy_input_config';

describe('PackagePolicyInputConfig', () => {
  function render(value = 'generic', datastreams: any = []) {
    const renderer = createFleetTestRendererMock();
    const mockOnChange = jest.fn();

    const utils = renderer.render(
      <PackagePolicyInputConfig
        hasInputStreams={false}
        inputVarsValidationResults={{}}
        packagePolicyInput={{
          enabled: true,
          type: 'input',
          streams: [],
        }}
        updatePackagePolicyInput={mockOnChange}
        packageInputVars={[
          {
            name: 'test',
            title: 'Test',
            type: 'text',
            show_user: true,
          },
        ]}
      />
    );

    return { utils, mockOnChange };
  }

  it('should support input vars with show_user:true without default value', () => {
    const { utils } = render();

    const inputEl = utils.findByTestId('textInput-test');
    expect(inputEl).toBeDefined();
  });
});
