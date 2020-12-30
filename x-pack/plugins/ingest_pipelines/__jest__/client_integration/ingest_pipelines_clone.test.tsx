/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, pageHelpers } from './helpers';
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

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  httpRequestsMockHelpers.setLoadPipelineResponse(PIPELINE_TO_CLONE);

  beforeEach(async () => {
    await act(async () => {
      testBed = await setup();
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

      const latestRequest = server.requests[server.requests.length - 1];

      const expected = {
        ...PIPELINE_TO_CLONE,
        name: `${PIPELINE_TO_CLONE.name}-copy`,
      };

      expect(JSON.parse(JSON.parse(latestRequest.requestBody).body)).toEqual(expected);
    });
  });
});
