/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../../mock';
import { Package } from './package';

describe('Package', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <Package
          contextId="[context-123]"
          eventId="[event-123]"
          packageName="package-name-123"
          packageSummary="package-summary-123"
          packageVersion="package-version-123"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if all of the package information is null ', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <Package
            contextId="[context-123]"
            eventId="[event-123]"
            packageName={null}
            packageSummary={null}
            packageVersion={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if all of the package information is undefined ', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <Package
            contextId="[context-123]"
            eventId="[event-123]"
            packageName={undefined}
            packageSummary={undefined}
            packageVersion={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns just the package name', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <Package
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary={undefined}
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[package-name-123]');
    });

    test('it returns just the package name and package summary', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <Package
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[package-name-123][package-summary-123]');
    });

    test('it returns just the package name, package summary, package version', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <Package
              contextId="[context-123]"
              eventId="[event-123]"
              packageName="[package-name-123]"
              packageSummary="[package-summary-123]"
              packageVersion="[package-version-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[package-name-123][package-version-123][package-summary-123]'
      );
    });
  });
});
