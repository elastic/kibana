/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { EmptyJourney } from './empty_journey';

describe('EmptyJourney component', () => {
  it('omits check group element when undefined', () => {
    expect(shallowWithIntl(<EmptyJourney />)).toMatchInlineSnapshot(`
      <EuiEmptyPrompt
        body={
          <React.Fragment>
            <p>
              <Memo(MemoizedFormattedMessage)
                defaultMessage="This journey did not contain any steps."
                id="xpack.uptime.synthetics.emptyJourney.message.heading"
              />
            </p>
            <p>
              <Memo(MemoizedFormattedMessage)
                defaultMessage="There is no further information to display."
                id="xpack.uptime.synthetics.emptyJourney.message.footer"
              />
            </p>
          </React.Fragment>
        }
        iconType="cross"
        title={
          <h2>
            <Memo(MemoizedFormattedMessage)
              defaultMessage="There are no steps for this journey"
              id="xpack.uptime.synthetics.emptyJourney.title"
            />
          </h2>
        }
      />
    `);
  });

  it('includes check group element when present', () => {
    expect(shallowWithIntl(<EmptyJourney checkGroup="check_group" />)).toMatchInlineSnapshot(`
      <EuiEmptyPrompt
        body={
          <React.Fragment>
            <p>
              <Memo(MemoizedFormattedMessage)
                defaultMessage="This journey did not contain any steps."
                id="xpack.uptime.synthetics.emptyJourney.message.heading"
              />
            </p>
            <p>
              <Memo(MemoizedFormattedMessage)
                defaultMessage="The journey's check group is {codeBlock}."
                id="xpack.uptime.synthetics.emptyJourney.message.checkGroupField"
                values={
                  Object {
                    "codeBlock": <code>
                      check_group
                    </code>,
                  }
                }
              />
            </p>
            <p>
              <Memo(MemoizedFormattedMessage)
                defaultMessage="There is no further information to display."
                id="xpack.uptime.synthetics.emptyJourney.message.footer"
              />
            </p>
          </React.Fragment>
        }
        iconType="cross"
        title={
          <h2>
            <Memo(MemoizedFormattedMessage)
              defaultMessage="There are no steps for this journey"
              id="xpack.uptime.synthetics.emptyJourney.title"
            />
          </h2>
        }
      />
    `);
  });
});
