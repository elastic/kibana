/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { ExecutedJourney } from './executed_journey';
import { Ping } from '../../../../common/runtime_types';

const MONITOR_BOILERPLATE = {
  id: 'MON_ID',
  duration: {
    us: 10,
  },
  status: 'down',
  type: 'browser',
};

describe('ExecutedJourney component', () => {
  let steps: Ping[];

  beforeEach(() => {
    steps = [
      {
        docId: '1',
        timestamp: '123',
        monitor: MONITOR_BOILERPLATE,
        synthetics: {
          payload: {
            status: 'failed',
          },
          type: 'step/end',
        },
      },
      {
        docId: '2',
        timestamp: '124',
        monitor: MONITOR_BOILERPLATE,
        synthetics: {
          payload: {
            status: 'failed',
          },
          type: 'step/end',
        },
      },
    ];
  });

  it('creates expected message for all failed', () => {
    const wrapper = shallowWithIntl(
      <ExecutedJourney
        journey={{
          loading: false,
          checkGroup: 'check_group',
          steps,
        }}
      />
    );
    expect(wrapper.find('EuiText')).toMatchInlineSnapshot(`
      <EuiText>
        <h3>
          <FormattedMessage
            defaultMessage="Summary information"
            id="xpack.uptime.synthetics.executedJourney.heading"
            values={Object {}}
          />
        </h3>
        <p>
          2 Steps - all failed or skipped
        </p>
      </EuiText>
    `);
  });

  it('creates expected message for all succeeded', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps[1].synthetics!.payload!.status = 'succeeded';
    const wrapper = shallowWithIntl(
      <ExecutedJourney
        journey={{
          loading: false,
          checkGroup: 'check_group',
          steps,
        }}
      />
    );
    expect(wrapper.find('EuiText')).toMatchInlineSnapshot(`
      <EuiText>
        <h3>
          <FormattedMessage
            defaultMessage="Summary information"
            id="xpack.uptime.synthetics.executedJourney.heading"
            values={Object {}}
          />
        </h3>
        <p>
          2 Steps - all succeeded
        </p>
      </EuiText>
    `);
  });

  it('creates appropriate message for mixed results', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    const wrapper = shallowWithIntl(
      <ExecutedJourney
        journey={{
          loading: false,
          checkGroup: 'check_group',
          steps,
        }}
      />
    );
    expect(wrapper.find('EuiText')).toMatchInlineSnapshot(`
      <EuiText>
        <h3>
          <FormattedMessage
            defaultMessage="Summary information"
            id="xpack.uptime.synthetics.executedJourney.heading"
            values={Object {}}
          />
        </h3>
        <p>
          2 Steps - 1 succeeded
        </p>
      </EuiText>
    `);
  });

  it('tallies skipped steps', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps[1].synthetics!.payload!.status = 'skipped';
    const wrapper = shallowWithIntl(
      <ExecutedJourney
        journey={{
          loading: false,
          checkGroup: 'check_group',
          steps,
        }}
      />
    );
    expect(wrapper.find('EuiText')).toMatchInlineSnapshot(`
      <EuiText>
        <h3>
          <FormattedMessage
            defaultMessage="Summary information"
            id="xpack.uptime.synthetics.executedJourney.heading"
            values={Object {}}
          />
        </h3>
        <p>
          2 Steps - 1 succeeded
        </p>
      </EuiText>
    `);
  });

  it('uses appropriate count when non-step/end steps are included', () => {
    steps[0].synthetics!.payload!.status = 'succeeded';
    steps.push({
      docId: '3',
      timestamp: '125',
      monitor: MONITOR_BOILERPLATE,
      synthetics: {
        type: 'stderr',
        error: {
          message: `there was an error, that's all we know`,
          stack: 'your.error.happened.here',
        },
      },
    });
    const wrapper = shallowWithIntl(
      <ExecutedJourney
        journey={{
          loading: false,
          checkGroup: 'check_group',
          steps,
        }}
      />
    );
    expect(wrapper.find('EuiText')).toMatchInlineSnapshot(`
      <EuiText>
        <h3>
          <FormattedMessage
            defaultMessage="Summary information"
            id="xpack.uptime.synthetics.executedJourney.heading"
            values={Object {}}
          />
        </h3>
        <p>
          2 Steps - 1 succeeded
        </p>
      </EuiText>
    `);
  });

  it('renders a component per step', () => {
    expect(
      shallowWithIntl(
        <ExecutedJourney journey={{ loading: false, checkGroup: 'check_group', steps }} />
      ).find('EuiFlexGroup')
    ).toMatchInlineSnapshot(`
      <EuiFlexGroup
        direction="column"
      >
        <ExecutedStep
          checkGroup="check_group"
          index={0}
          key="0"
          step={
            Object {
              "docId": "1",
              "monitor": Object {
                "duration": Object {
                  "us": 10,
                },
                "id": "MON_ID",
                "status": "down",
                "type": "browser",
              },
              "synthetics": Object {
                "payload": Object {
                  "status": "failed",
                },
                "type": "step/end",
              },
              "timestamp": "123",
            }
          }
        />
        <ExecutedStep
          checkGroup="check_group"
          index={1}
          key="1"
          step={
            Object {
              "docId": "2",
              "monitor": Object {
                "duration": Object {
                  "us": 10,
                },
                "id": "MON_ID",
                "status": "down",
                "type": "browser",
              },
              "synthetics": Object {
                "payload": Object {
                  "status": "failed",
                },
                "type": "step/end",
              },
              "timestamp": "124",
            }
          }
        />
        <EuiSpacer
          size="s"
        />
      </EuiFlexGroup>
    `);
  });
});
