/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ExecutedStep } from './executed_step';
import { Ping } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';

describe('ExecutedStep', () => {
  let step: Ping;

  beforeEach(() => {
    step = {
      docId: 'docID',
      monitor: {
        duration: {
          us: 123,
        },
        id: 'id',
        status: 'up',
        type: 'browser',
      },
      synthetics: {
        step: {
          index: 4,
          name: 'STEP_NAME',
        },
      },
      timestamp: 'timestamp',
    };
  });

  it('renders correct step heading', () => {
    const { getByText } = render(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />);

    expect(getByText(`${step?.synthetics?.step?.index}. ${step?.synthetics?.step?.name}`));
  });

  it('renders a link to the step detail view', () => {
    const { getByRole, getByText } = render(
      <ExecutedStep index={3} step={step} checkGroup={'fake-group'} />
    );
    expect(getByRole('link')).toHaveAttribute('href', '/journey/fake-group/step/4');
    expect(getByText('4. STEP_NAME'));
  });

  it.each([
    ['succeeded', 'Succeeded'],
    ['failed', 'Failed'],
    ['skipped', 'Skipped'],
    ['somegarbage', '4.'],
  ])('supplies status badge correct status', (status, expectedStatus) => {
    step.synthetics = {
      payload: { status },
    };
    const { getByText } = render(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />);
    expect(getByText(expectedStatus));
  });

  it('renders accordion for step', () => {
    step.synthetics = {
      payload: {
        source: 'const someVar = "the var"',
      },
      step: {
        index: 3,
        name: 'STEP_NAME',
      },
    };

    const { getByText } = render(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />);

    expect(getByText('4. STEP_NAME'));
    expect(getByText('Step script'));
    expect(getByText(`const someVar = "the var"`));
  });

  it('renders accordions for error message, and stack trace', () => {
    step.synthetics = {
      error: {
        message: 'There was an error executing the step.',
        stack: 'some.stack.trace.string',
      },
    };

    const { getByText } = render(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />);

    expect(getByText('4.'));
    expect(getByText('Error'));
    expect(getByText('There was an error executing the step.'));
    expect(getByText('some.stack.trace.string'));
  });
});
