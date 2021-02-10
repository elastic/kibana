/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExecutedStep } from './executed_step';
import { render } from '../../lib/helper/rtl_helpers';
import { Ping } from '../../../common/runtime_types/ping';

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

    expect(getByText('Script executed at this step'));
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

    expect(getByText('Error message'));
    expect(getByText('There was an error executing the step.'));
    expect(getByText('some.stack.trace.string'));
  });
});
