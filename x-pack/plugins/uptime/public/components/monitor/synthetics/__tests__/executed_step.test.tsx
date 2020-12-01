/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, mountWithIntl } from '@kbn/test/jest';
import React from 'react';
import { ExecutedStep } from '../executed_step';
import { Ping } from '../../../../../common/runtime_types';

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
    expect(mountWithIntl(<ExecutedStep index={3} step={step} />).find('EuiText'))
      .toMatchInlineSnapshot(`
      <EuiText>
        <div
          className="euiText euiText--medium"
        >
          <strong>
            <FormattedMessage
              defaultMessage="{stepNumber}. {stepName}"
              id="xpack.uptime.synthetics.executedStep.stepName"
              values={
                Object {
                  "stepName": "STEP_NAME",
                  "stepNumber": 4,
                }
              }
            >
              4. STEP_NAME
            </FormattedMessage>
          </strong>
        </div>
      </EuiText>
    `);
  });

  it('supplies status badge correct status', () => {
    step.synthetics = {
      payload: { status: 'THE_STATUS' },
    };
    expect(shallowWithIntl(<ExecutedStep index={3} step={step} />).find('StatusBadge'))
      .toMatchInlineSnapshot(`
      <StatusBadge
        status="THE_STATUS"
      />
    `);
  });

  it('renders accordions for step, error message, and error stack script', () => {
    step.synthetics = {
      error: {
        message: 'There was an error executing the step.',
        stack: 'some.stack.trace.string',
      },
      payload: {
        source: 'const someVar = "the var"',
      },
      step: {
        index: 3,
        name: 'STEP_NAME',
      },
    };

    expect(shallowWithIntl(<ExecutedStep index={3} step={step} />).find('CodeBlockAccordion'))
      .toMatchInlineSnapshot(`
      Array [
        <CodeBlockAccordion
          buttonContent="Step script"
          id="STEP_NAME3"
          language="javascript"
          overflowHeight={360}
        >
          const someVar = "the var"
        </CodeBlockAccordion>,
        <CodeBlockAccordion
          buttonContent="Error"
          id="STEP_NAME_error"
          language="html"
          overflowHeight={360}
        >
          There was an error executing the step.
        </CodeBlockAccordion>,
        <CodeBlockAccordion
          buttonContent="Stack trace"
          id="STEP_NAME_stack"
          language="html"
          overflowHeight={360}
        >
          some.stack.trace.string
        </CodeBlockAccordion>,
      ]
    `);
  });
});
