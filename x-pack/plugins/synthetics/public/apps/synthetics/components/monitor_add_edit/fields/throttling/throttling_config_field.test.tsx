/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ThrottlingConfigField } from './throttling_config_field';
import { render } from '../../../../utils/testing';
import { PROFILES_MAP } from '../../../../../../../common/constants/monitor_defaults';

describe('ThrottlingConfigField', () => {
  it('renders', () => {
    const {} = render(
      <ThrottlingConfigField
        ariaLabel={'ariaLabel'}
        defaultValue={PROFILES_MAP.default}
        id={'id'}
        options={[]}
        onChange={() => {}}
      />
    );
    expect(true).toBe(true);
  });
});
