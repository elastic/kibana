/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExecutedStep } from './executed_step';
import { render } from '../../lib/helper/rtl_helpers';
import { JourneyStep } from '../../../common/runtime_types/ping';

describe('ExecutedStep', () => {
  let step: JourneyStep;

  beforeEach(() => {
    step = {
      _id: 'docID',
      monitor: {
        check_group: 'check_group',
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
        type: 'step/end',
      },
      '@timestamp': 'timestamp',
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
      type: 'step/end',
    };

    const { getByText } = render(<ExecutedStep index={3} step={step} loading={false} />);

    expect(getByText('Script executed at this step'));
    expect(getByText(`const someVar = "the var"`));
  });

  it('renders accordions for error message, and stack trace', () => {
    step.synthetics = {
      error: {
        message: 'There was an error executing the step.',
        stack: 'some.stack.trace.string',
      },
      type: 'an error type',
    };

    const { getByText } = render(<ExecutedStep index={3} step={step} loading={false} />);

    expect(getByText('Error message'));
    expect(getByText('There was an error executing the step.'));
    expect(getByText('some.stack.trace.string'));
  });

  it('renders accordions for console output', () => {
    const browserConsole =
      "Refused to execute script from because its MIME type ('image/gif') is not executable";

    const { getByText } = render(
      <ExecutedStep browserConsole={browserConsole} index={3} step={step} loading={false} />
    );

    expect(getByText('Console output'));
    expect(getByText(browserConsole));
  });
});
