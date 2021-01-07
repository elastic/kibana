/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ExecutedStep } from './executed_step';
import { Ping } from '../../../../common/runtime_types';
import { mountWithRouter } from '../../../lib';

// FLAKY: https://github.com/elastic/kibana/issues/85899
describe.skip('ExecutedStep', () => {
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
    expect(
      mountWithRouter(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />).find(
        'EuiText'
      )
    ).toMatchInlineSnapshot(`
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

  it('renders a link to the step detail view', () => {
    expect(
      mountWithRouter(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />).find(
        'StepDetailLink'
      )
    ).toMatchInlineSnapshot(`
      <StepDetailLink
        checkGroupId="fake-group"
        stepIndex={4}
      >
        <EuiLink>
          <button
            className="euiLink euiLink--primary"
            disabled={false}
            type="button"
          >
            <Link
              data-test-subj="step-detail-link"
              to="/journey/fake-group/step/4"
            >
              <LinkAnchor
                data-test-subj="step-detail-link"
                href="/journey/fake-group/step/4"
                navigate={[Function]}
              >
                <a
                  data-test-subj="step-detail-link"
                  href="/journey/fake-group/step/4"
                  onClick={[Function]}
                >
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
                </a>
              </LinkAnchor>
            </Link>
          </button>
        </EuiLink>
      </StepDetailLink>
    `);
  });

  it('supplies status badge correct status', () => {
    step.synthetics = {
      payload: { status: 'THE_STATUS' },
    };
    expect(
      mountWithRouter(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />).find(
        'StatusBadge'
      )
    ).toMatchInlineSnapshot(`
      <StatusBadge
        status="THE_STATUS"
      >
        <EuiBadge
          color="default"
        >
          <EuiInnerText>
            <span
              className="euiBadge euiBadge--iconLeft"
              style={
                Object {
                  "backgroundColor": "#d3dae6",
                  "color": "#000",
                }
              }
            >
              <span
                className="euiBadge__content"
              />
            </span>
          </EuiInnerText>
        </EuiBadge>
      </StatusBadge>
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

    expect(
      mountWithRouter(<ExecutedStep index={3} step={step} checkGroup={'fake-group'} />).find(
        'CodeBlockAccordion'
      )
    ).toMatchInlineSnapshot(`
      Array [
        <CodeBlockAccordion
          buttonContent="Step script"
          id="STEP_NAME3"
          language="javascript"
          overflowHeight={360}
        >
          <EuiAccordion
            arrowDisplay="left"
            buttonContent="Step script"
            id="STEP_NAME3"
            initialIsOpen={false}
            isLoading={false}
            isLoadingMessage={false}
            paddingSize="none"
          >
            <div
              className="euiAccordion"
            >
              <div
                className="euiAccordion__triggerWrapper"
              >
                <button
                  aria-controls="STEP_NAME3"
                  aria-expanded={false}
                  className="euiAccordion__button"
                  id="generated-id"
                  onClick={[Function]}
                  type="button"
                >
                  <span
                    className="euiAccordion__iconWrapper"
                  >
                    <EuiIcon
                      className="euiAccordion__icon"
                      size="m"
                      type="arrowRight"
                    >
                      <span
                        className="euiAccordion__icon"
                        data-euiicon-type="arrowRight"
                        size="m"
                      />
                    </EuiIcon>
                  </span>
                  <span
                    className="euiIEFlexWrapFix"
                  >
                    Step script
                  </span>
                </button>
              </div>
              <div
                className="euiAccordion__childWrapper"
                id="STEP_NAME3"
              >
                <EuiResizeObserver
                  onResize={[Function]}
                >
                  <div>
                    <div
                      className=""
                    >
                      <EuiCodeBlock
                        isCopyable={true}
                        language="javascript"
                        overflowHeight={360}
                      >
                        <EuiCodeBlockImpl
                          inline={false}
                          isCopyable={true}
                          language="javascript"
                          overflowHeight={360}
                        >
                          <div>
                            <pre>
                              <code>
                                const someVar = "the var"
                              </code>
                            </pre>
                          </div>
                        </EuiCodeBlockImpl>
                      </EuiCodeBlock>
                    </div>
                  </div>
                </EuiResizeObserver>
              </div>
            </div>
          </EuiAccordion>
        </CodeBlockAccordion>,
        <CodeBlockAccordion
          buttonContent="Error"
          id="STEP_NAME_error"
          language="html"
          overflowHeight={360}
        >
          <EuiAccordion
            arrowDisplay="left"
            buttonContent="Error"
            id="STEP_NAME_error"
            initialIsOpen={false}
            isLoading={false}
            isLoadingMessage={false}
            paddingSize="none"
          >
            <div
              className="euiAccordion"
            >
              <div
                className="euiAccordion__triggerWrapper"
              >
                <button
                  aria-controls="STEP_NAME_error"
                  aria-expanded={false}
                  className="euiAccordion__button"
                  id="generated-id"
                  onClick={[Function]}
                  type="button"
                >
                  <span
                    className="euiAccordion__iconWrapper"
                  >
                    <EuiIcon
                      className="euiAccordion__icon"
                      size="m"
                      type="arrowRight"
                    >
                      <span
                        className="euiAccordion__icon"
                        data-euiicon-type="arrowRight"
                        size="m"
                      />
                    </EuiIcon>
                  </span>
                  <span
                    className="euiIEFlexWrapFix"
                  >
                    Error
                  </span>
                </button>
              </div>
              <div
                className="euiAccordion__childWrapper"
                id="STEP_NAME_error"
              >
                <EuiResizeObserver
                  onResize={[Function]}
                >
                  <div>
                    <div
                      className=""
                    >
                      <EuiCodeBlock
                        isCopyable={true}
                        language="html"
                        overflowHeight={360}
                      >
                        <EuiCodeBlockImpl
                          inline={false}
                          isCopyable={true}
                          language="html"
                          overflowHeight={360}
                        >
                          <div>
                            <pre>
                              <code>
                                There was an error executing the step.
                              </code>
                            </pre>
                          </div>
                        </EuiCodeBlockImpl>
                      </EuiCodeBlock>
                    </div>
                  </div>
                </EuiResizeObserver>
              </div>
            </div>
          </EuiAccordion>
        </CodeBlockAccordion>,
        <CodeBlockAccordion
          buttonContent="Stack trace"
          id="STEP_NAME_stack"
          language="html"
          overflowHeight={360}
        >
          <EuiAccordion
            arrowDisplay="left"
            buttonContent="Stack trace"
            id="STEP_NAME_stack"
            initialIsOpen={false}
            isLoading={false}
            isLoadingMessage={false}
            paddingSize="none"
          >
            <div
              className="euiAccordion"
            >
              <div
                className="euiAccordion__triggerWrapper"
              >
                <button
                  aria-controls="STEP_NAME_stack"
                  aria-expanded={false}
                  className="euiAccordion__button"
                  id="generated-id"
                  onClick={[Function]}
                  type="button"
                >
                  <span
                    className="euiAccordion__iconWrapper"
                  >
                    <EuiIcon
                      className="euiAccordion__icon"
                      size="m"
                      type="arrowRight"
                    >
                      <span
                        className="euiAccordion__icon"
                        data-euiicon-type="arrowRight"
                        size="m"
                      />
                    </EuiIcon>
                  </span>
                  <span
                    className="euiIEFlexWrapFix"
                  >
                    Stack trace
                  </span>
                </button>
              </div>
              <div
                className="euiAccordion__childWrapper"
                id="STEP_NAME_stack"
              >
                <EuiResizeObserver
                  onResize={[Function]}
                >
                  <div>
                    <div
                      className=""
                    >
                      <EuiCodeBlock
                        isCopyable={true}
                        language="html"
                        overflowHeight={360}
                      >
                        <EuiCodeBlockImpl
                          inline={false}
                          isCopyable={true}
                          language="html"
                          overflowHeight={360}
                        >
                          <div>
                            <pre>
                              <code>
                                some.stack.trace.string
                              </code>
                            </pre>
                          </div>
                        </EuiCodeBlockImpl>
                      </EuiCodeBlock>
                    </div>
                  </div>
                </EuiResizeObserver>
              </div>
            </div>
          </EuiAccordion>
        </CodeBlockAccordion>,
      ]
    `);
  });
});
