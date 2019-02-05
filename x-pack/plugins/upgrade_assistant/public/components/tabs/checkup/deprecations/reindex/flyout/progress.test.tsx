/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { IndexGroup, ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { ReindexState } from '../polling_service';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: null,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
<Component
  steps={
    Array [
      Object {
        "status": "incomplete",
        "title": "Setting old index to read-only",
      },
      Object {
        "status": "incomplete",
        "title": "Creating new index",
      },
      Object {
        "status": "incomplete",
        "title": "Reindexing documents",
      },
      Object {
        "status": "incomplete",
        "title": "Swapping original index with alias",
      },
    ]
  }
/>
`);
  });

  it('displays errors in the step that failed', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexCompleted,
            status: ReindexStatus.failed,
            reindexTaskPercComplete: 1,
            errorMessage: `This is an error that happened on alias switch`,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    const aliasStep = wrapper.props().steps[3];
    expect(aliasStep.children.props.errorMessage).toEqual(
      `This is an error that happened on alias switch`
    );
  });

  it('shows reindexing document progress bar', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.reindexStarted,
            status: ReindexStatus.inProgress,
            reindexTaskPercComplete: 0.25,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    const reindexStep = wrapper.props().steps[2];
    expect(reindexStep.children.type.name).toEqual('ReindexProgressBar');
    expect(reindexStep.children.props.reindexState.reindexTaskPercComplete).toEqual(0.25);
  });

  it('adds steps for index groups', () => {
    const wrapper = shallow(
      <ReindexProgress
        reindexState={
          {
            lastCompletedStep: ReindexStep.created,
            status: ReindexStatus.inProgress,
            indexGroup: IndexGroup.ml,
            reindexTaskPercComplete: null,
            errorMessage: null,
          } as ReindexState
        }
        cancelReindex={jest.fn()}
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
<Component
  steps={
    Array [
      Object {
        "status": "inProgress",
        "title": "Pausing Machine Learning jobs",
      },
      Object {
        "status": "incomplete",
        "title": "Setting old index to read-only",
      },
      Object {
        "status": "incomplete",
        "title": "Creating new index",
      },
      Object {
        "status": "incomplete",
        "title": "Reindexing documents",
      },
      Object {
        "status": "incomplete",
        "title": "Swapping original index with alias",
      },
      Object {
        "status": "incomplete",
        "title": "Resuming Machine Learning jobs",
      },
    ]
  }
/>
`);
  });
});
