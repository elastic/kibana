/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { getTemplate } from '../../../test/fixtures';
import { setupEnvironment, nextTick } from '../helpers';

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
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj="mockCodeEditor"
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

// FLAKY: https://github.com/elastic/kibana/issues/59849
describe.skip('<TemplateClone />', () => {
  let testBed: TemplateFormTestBed;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  const templateToClone = getTemplate({
    name: TEMPLATE_NAME,
    indexPatterns: ['indexPattern1'],
    template: {
      mappings: MAPPINGS,
    },
    isLegacy: true,
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadTemplateResponse(templateToClone);

    await act(async () => {
      testBed = await setup();
      await testBed.waitFor('templateForm');
    });
  });

  test('should set the correct page title', () => {
    const { exists, find } = testBed;

    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual(`Clone template '${templateToClone.name}'`);
  });

  describe('form payload', () => {
    beforeEach(async () => {
      const { actions } = testBed;

      await act(async () => {
        // Complete step 1 (logistics)
        // Specify index patterns, but do not change name (keep default)
        await actions.completeStepOne({
          indexPatterns: DEFAULT_INDEX_PATTERNS,
        });

        // Bypass step 2 (index settings)
        await actions.completeStepTwo();

        // Bypass step 3 (mappings)
        await actions.completeStepThree();

        // Bypass step 4 (aliases)
        await actions.completeStepFour();
      });
    });

    it('should send the correct payload', async () => {
      const { actions } = testBed;

      await act(async () => {
        actions.clickSubmitButton();
        await nextTick();
      });

      const latestRequest = server.requests[server.requests.length - 1];

      const expected = {
        ...templateToClone,
        name: `${templateToClone.name}-copy`,
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      };

      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });
  });
});
