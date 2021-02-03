/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { BrowserExpandedRowComponent } from './browser_expanded_row';
import { Ping } from '../../../../common/runtime_types';

describe('BrowserExpandedRowComponent', () => {
  let defStep: Ping;
  beforeEach(() => {
    defStep = {
      docId: 'doc-id',
      timestamp: '123',
      monitor: {
        duration: {
          us: 100,
        },
        id: 'mon-id',
        status: 'up',
        type: 'browser',
      },
    };
  });

  it('returns empty step state when no journey', () => {
    expect(shallowWithIntl(<BrowserExpandedRowComponent />)).toMatchInlineSnapshot(
      `<EmptyJourney />`
    );
  });

  it('returns empty step state when journey has no steps', () => {
    expect(
      shallowWithIntl(
        <BrowserExpandedRowComponent
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [],
          }}
        />
      )
    ).toMatchInlineSnapshot(`<EmptyJourney />`);
  });

  it('displays loading spinner when loading', () => {
    expect(
      shallowWithIntl(
        <BrowserExpandedRowComponent
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
        <BrowserExpandedRowComponent
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                ...defStep,
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
        journey={
          Object {
            "checkGroup": "check_group",
            "loading": false,
            "steps": Array [
              Object {
                "docId": "doc-id",
                "monitor": Object {
                  "duration": Object {
                    "us": 100,
                  },
                  "id": "mon-id",
                  "status": "up",
                  "type": "browser",
                },
                "synthetics": Object {
                  "type": "step/end",
                },
                "timestamp": "123",
              },
            ],
          }
        }
      />
    `);
  });

  it('handles case where synth type is somehow missing', () => {
    expect(
      shallowWithIntl(
        <BrowserExpandedRowComponent
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                ...defStep,
                synthetics: {
                  type: undefined,
                },
              },
            ],
          }}
        />
      )
    ).toMatchInlineSnapshot(`""`);
  });

  it('renders console output step list when only console steps are present', () => {
    expect(
      shallowWithIntl(
        <BrowserExpandedRowComponent
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                ...defStep,
                synthetics: {
                  type: 'stderr',
                },
              },
            ],
          }}
        />
      )
    ).toMatchInlineSnapshot(`
      <ConsoleOutputEventList
        journey={
          Object {
            "checkGroup": "check_group",
            "loading": false,
            "steps": Array [
              Object {
                "docId": "doc-id",
                "monitor": Object {
                  "duration": Object {
                    "us": 100,
                  },
                  "id": "mon-id",
                  "status": "up",
                  "type": "browser",
                },
                "synthetics": Object {
                  "type": "stderr",
                },
                "timestamp": "123",
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
        <BrowserExpandedRowComponent
          journey={{
            checkGroup: 'check_group',
            loading: false,
            steps: [
              {
                ...defStep,
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
