/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
import { API_BASE_PATH } from '../../common/constants';
import { PIPELINE_TO_CLONE, PipelinesCloneTestBed } from './helpers/pipelines_clone.helpers';

const { setup } = pageHelpers.pipelinesClone;

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiCodeEditor, which uses React Ace under the hood
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj']}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});

describe('<PipelinesClone />', () => {
  let testBed: PipelinesCloneTestBed;

  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPipelineResponse(PIPELINE_TO_CLONE.name, PIPELINE_TO_CLONE);

    await act(async () => {
      testBed = await setup(httpSetup);
    });

    testBed.component.update();
  });

  test('should render the correct page header', () => {
    const { exists, find } = testBed;

    // Verify page title
    expect(exists('pageTitle')).toBe(true);
    expect(find('pageTitle').text()).toEqual('Create pipeline');

    // Verify documentation link
    expect(exists('documentationLink')).toBe(true);
    expect(find('documentationLink').text()).toBe('Create pipeline docs');
  });

  describe('form submission', () => {
    it('should send the correct payload', async () => {
      const { actions } = testBed;

      await actions.clickSubmitButton();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        API_BASE_PATH,
        expect.objectContaining({
          body: JSON.stringify({
            ...PIPELINE_TO_CLONE,
            name: `${PIPELINE_TO_CLONE.name}-copy`,
          }),
        })
      );
    });
  });
});
