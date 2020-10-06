/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { SyntheticsCallout } from '../synthetics_callout';

describe('SyntheticsCallout', () => {
  let setItemMock;
  let localStorageMock: any;

  beforeEach(() => {
    setItemMock = jest.fn();
    localStorageMock = {
      getItem: jest.fn().mockImplementation(() => null),
      setItem: setItemMock,
    };

    //  @ts-expect-error replacing a call to localStorage we use for monitor list size
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
              defaultMessage="Elastic Uptime now supports synthetic browser monitors! Learn how to use them {here}."
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
              values={
                Object {
                  "here": <a
                    href="https://elastic.co/synthetics"
                  >
                    here
                  </a>,
                }
              }
            />
          </p>
          <EuiButton
            onClick={[Function]}
          >
            <FormattedMessage
              defaultMessage="Dismiss"
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
              values={Object {}}
            />
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer
          size="s"
        />
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
              defaultMessage="Elastic Uptime now supports synthetic browser monitors! Learn how to use them {here}."
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.content"
              values={
                Object {
                  "here": <a
                    href="https://elastic.co/synthetics"
                  >
                    here
                  </a>,
                }
              }
            />
          </p>
          <EuiButton
            onClick={[Function]}
          >
            <FormattedMessage
              defaultMessage="Dismiss"
              id="xpack.uptime.overview.pageHeader.syntheticsCallout.dismissButtonText"
              values={Object {}}
            />
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer
          size="s"
        />
      </Fragment>
    `);
    wrapper.find('EuiButton').simulate('click');
    expect(wrapper).toEqual({});
  });
});
