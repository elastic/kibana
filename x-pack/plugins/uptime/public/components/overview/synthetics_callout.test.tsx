/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { SyntheticsCallout } from './synthetics_callout';

describe('SyntheticsCallout', () => {
  let setItemMock;
  let localStorageMock: any;

  beforeEach(() => {
    setItemMock = jest.fn();
    localStorageMock = {
      getItem: jest.fn().mockImplementation(() => null),
      setItem: setItemMock,
    };

    global.localStorage = localStorageMock;
  });

  it('renders component if dismissal flag is unset', () => {
    expect(shallowWithIntl(<SyntheticsCallout />)).toMatchInlineSnapshot(`
      <Fragment>
        <EuiCallOut
          iconType="beaker"
          title="Elastic Synthetics"
        >
          <p>
            <FormattedMessage
              defaultMessage="Uptime is now previewing support for scripted multi-step availability checks. This means you can interact with elements of a webpage and check the availability of an entire journey (such as making a purchase or signing into a system) instead of just a simple single page up/down check. Please click below to read more and, if you'd like to be one of the first to use these capabilities, you can download our preview synthetics agent and view your synthetic checks in Uptime."
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
              values={Object {}}
            />
          </p>
          <EuiFlexGroup>
            <EuiFlexItem
              grow={false}
            >
              <EuiButton
                href="https://www.elastic.co/what-is/synthetic-monitoring"
              >
                <FormattedMessage
                  defaultMessage="Read announcement"
                  id="xpack.uptime.overview.pageHeader.syntheticsCallout.announcementLink"
                  values={Object {}}
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <EuiButtonEmpty
                data-test-subj="uptimeDismissSyntheticsCallout"
                onClick={[Function]}
              >
                <FormattedMessage
                  defaultMessage="Dismiss"
                  id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
                  values={Object {}}
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      </Fragment>
    `);
  });

  it('returns null if callout has been dismissed', () => {
    localStorageMock.getItem = jest.fn().mockImplementation(() => 'true');
    expect(shallowWithIntl(<SyntheticsCallout />)).toEqual({});
  });

  it('renders the component, and then returns null when dismiss button clicked', () => {
    localStorageMock.getItem = jest
      .fn()
      .mockImplementationOnce(() => null)
      .mockImplementationOnce(() => 'true');
    const wrapper = shallowWithIntl(<SyntheticsCallout />);
    expect(wrapper).toMatchInlineSnapshot(`
      <Fragment>
        <EuiCallOut
          iconType="beaker"
          title="Elastic Synthetics"
        >
          <p>
            <FormattedMessage
              defaultMessage="Uptime is now previewing support for scripted multi-step availability checks. This means you can interact with elements of a webpage and check the availability of an entire journey (such as making a purchase or signing into a system) instead of just a simple single page up/down check. Please click below to read more and, if you'd like to be one of the first to use these capabilities, you can download our preview synthetics agent and view your synthetic checks in Uptime."
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
              values={Object {}}
            />
          </p>
          <EuiFlexGroup>
            <EuiFlexItem
              grow={false}
            >
              <EuiButton
                href="https://www.elastic.co/what-is/synthetic-monitoring"
              >
                <FormattedMessage
                  defaultMessage="Read announcement"
                  id="xpack.uptime.overview.pageHeader.syntheticsCallout.announcementLink"
                  values={Object {}}
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
            >
              <EuiButtonEmpty
                data-test-subj="uptimeDismissSyntheticsCallout"
                onClick={[Function]}
              >
                <FormattedMessage
                  defaultMessage="Dismiss"
                  id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
                  values={Object {}}
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      </Fragment>
    `);
    wrapper.find('EuiButton').simulate('click');
    expect(wrapper).toEqual({});
  });
});
