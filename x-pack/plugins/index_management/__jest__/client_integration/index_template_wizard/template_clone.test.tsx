/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import '../../../test/global_mocks';
import { API_BASE_PATH } from '../../../common/constants';
import { getComposableTemplate } from '../../../test/fixtures';
import { setupEnvironment } from '../helpers';

import { TEMPLATE_NAME, INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS, MAPPINGS } from './constants';
import { setup } from './template_clone.helpers';
import { TemplateFormTestBed } from './template_form.helpers';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj="mockComboBox"
        onChange={async (syntheticEvent: any) => {
          props.onChange([syntheticEvent['0']]);
        }}
      />
    ),
  };
});

const templateToClone = getComposableTemplate({
  name: TEMPLATE_NAME,
  indexPatterns: ['indexPattern1'],
  template: {
    mappings: MAPPINGS,
  },
});

describe('<TemplateClone />', () => {
  let testBed: TemplateFormTestBed;
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    httpRequestsMockHelpers.setLoadTemplateResponse(templateToClone.name, templateToClone);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup(httpSetup);
    });
    testBed.component.update();
  });

  test('should set the correct page title', () => {
    const { exists, find } = testBed;

    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual(`Clone template '${templateToClone.name}'`);
  });

  describe('form payload', () => {
    beforeEach(async () => {
      const { actions } = testBed;

      // Logistics
      // Specify index patterns, but do not change name (keep default)
      await actions.completeStepOne({
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      });
      // Component templates
      await actions.completeStepTwo();
      // Index settings
      await actions.completeStepThree();
      // Mappings
      await actions.completeStepFour();
      // Aliases
      await actions.completeStepFive();
    });

    it('should send the correct payload', async () => {
      const { actions } = testBed;

      await act(async () => {
        actions.clickNextButton();
      });

      expect(httpSetup.post).toHaveBeenLastCalledWith(`${API_BASE_PATH}/index_templates`, expect.anything());
    });
  });
});
