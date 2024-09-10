/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import Fields from './case_fields';
import { theHiveConnector as connector } from '../mock';
import { MockFormWrapperComponent } from '../test_utils';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { TheHiveTLP } from './types';

// Failing: See https://github.com/elastic/kibana/issues/192475
describe.skip('TheHive Cases Fields', () => {
  const fields = {
    TLP: 1,
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('all params fields are rendered', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByText('TLP')).toBeInTheDocument();
  });

  it('sets TLP correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    userEvent.selectOptions(screen.getByTestId('tlp-field'), '4');
    expect(await screen.findByTestId('tlp-field')).toHaveValue(TheHiveTLP.RED.toString());
  });
});
