/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ScriptExpandedRowComponent } from '../script_expanded_row';

describe('ScriptExpandedRowComponent', () => {
  it('returns empty step state when no journey', () => {
    expect(
      shallowWithIntl(<ScriptExpandedRowComponent fetchScreenshot={jest.fn()} />)
    ).toMatchInlineSnapshot(`<EmptyStepState />`);
  });

  it('returns empty step state when journey has no steps', () => {
    expect(
      shallowWithIntl(
        <ScriptExpandedRowComponent
          fetchScreenshot={jest.fn()}
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [],
          }}
        />
      )
    ).toMatchInlineSnapshot(`<EmptyStepState />`);
  });

  it('displays loading spinner when loading', () => {
    expect(
      shallowWithIntl(
        <ScriptExpandedRowComponent
          fetchScreenshot={jest.fn()}
          journey={{
            checkGroup: 'check_group',
            loading: true,
            steps: [],
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <div>
        <EuiLoadingSpinner />
      </div>
    `);
  });

  it('renders executed journey when step/end is present', () => {
    expect(
      shallowWithIntl(
        <ScriptExpandedRowComponent
          fetchScreenshot={jest.fn()}
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                synthetics: {
                  type: 'step/end',
                },
              },
            ],
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <ExecutedJourney
        fetchScreenshot={[MockFunction]}
        journey={
          Object {
            "checkGroup": "check_group",
            "loading": false,
            "steps": Array [
              Object {
                "synthetics": Object {
                  "type": "step/end",
                },
              },
            ],
          }
        }
      />
    `);
  });

  it('renders console output step list when only console steps are present', () => {
    expect(
      shallowWithIntl(
        <ScriptExpandedRowComponent
          fetchScreenshot={jest.fn()}
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                synthetics: {
                  type: 'stderr',
                },
              },
            ],
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <ConsoleOutputStepList
        journey={
          Object {
            "checkGroup": "check_group",
            "loading": false,
            "steps": Array [
              Object {
                "synthetics": Object {
                  "type": "stderr",
                },
              },
            ],
          }
        }
      />
    `);
  });

  it('renders null when only unsupported steps are present', () => {
    expect(
      shallowWithIntl(
        <ScriptExpandedRowComponent
          fetchScreenshot={jest.fn()}
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                synthetics: {
                  type: 'some other type',
                },
              },
            ],
          }}
        />
      )
    ).toMatchInlineSnapshot(`""`);
  });
});
