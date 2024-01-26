/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen } from '@testing-library/react';

import '@testing-library/jest-dom';

import { HttpSetupMock } from '@kbn/core-http-browser-mocks';

import { HttpLogic } from '../../../shared/http';
import { TestHelper } from '../../../test_helpers/test_utils.test_helper';
import { FetchDefaultPipelineApiLogic } from '../../api/connector/get_default_pipeline_api_logic';

import { Settings } from './settings';

test('displays Settings Save-Reset buttons disabled by default', async () => {
  TestHelper.prepare();
  TestHelper.mountLogic(FetchDefaultPipelineApiLogic);
  TestHelper.appendCallback(() => {
    const http = HttpLogic.values.http as HttpSetupMock;
    http.get.mockImplementationOnce(() =>
      Promise.resolve({
        extract_binary_content: true,
        name: 'test',
        reduce_whitespace: true,
        run_ml_inference: true,
      })
    );
  });
  TestHelper.render(<Settings />);

  const saveButton = screen.getByTestId('entSearchContentSettingsSaveButton');
  const resetButton = screen.getByTestId('entSearchContentSettingsResetButton');

  expect(saveButton).toHaveTextContent('Save');
  expect(saveButton).toBeDisabled();
  expect(resetButton).toHaveTextContent('Reset');
  expect(resetButton).toBeDisabled();
});
