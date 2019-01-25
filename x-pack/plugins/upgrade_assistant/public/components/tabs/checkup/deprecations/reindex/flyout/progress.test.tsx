/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { ReindexProgress } from './progress';

describe('ReindexProgress', () => {
  it('renders', () => {
    const wrapper = shallow(
      <ReindexProgress
        lastCompletedStep={ReindexStep.created}
        reindexStatus={ReindexStatus.inProgress}
        reindexTaskPercComplete={null}
        errorMessage={null}
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
        lastCompletedStep={ReindexStep.reindexCompleted}
        reindexStatus={ReindexStatus.failed}
        reindexTaskPercComplete={1}
        errorMessage={`This is an error that happened on alias switch`}
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
        lastCompletedStep={ReindexStep.reindexStarted}
        reindexStatus={ReindexStatus.inProgress}
        reindexTaskPercComplete={0.25}
        errorMessage={null}
      />
    );

    const reindexStep = wrapper.props().steps[2];
    expect(reindexStep.children.type.name).toEqual('EuiProgress');
    expect(reindexStep.children.props.value).toEqual(0.25);
  });
});
