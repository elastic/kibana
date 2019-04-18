/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* global jest */

import { ReactWrapper } from 'enzyme';
import enzymeToJson from 'enzyme-to-json';
import { History, Location } from 'history';
import 'jest-styled-components';
import moment from 'moment';
import { Moment } from 'moment-timezone';
import React from 'react';
import { render, waitForElement } from 'react-testing-library';
import { LocationProvider } from '../context/LocationContext';

export function toJson(wrapper: ReactWrapper) {
  return enzymeToJson(wrapper, {
    noKey: true,
    mode: 'deep'
  });
}

export function mockMoment() {
  // avoid timezone issues
  jest
    .spyOn(moment.prototype, 'format')
    .mockImplementation(function(this: Moment) {
      return `1st of January (mocking ${this.unix()})`;
    });

  // convert relative time to absolute time to avoid timing issues
  jest
    .spyOn(moment.prototype, 'fromNow')
    .mockImplementation(function(this: Moment) {
      return `1337 minutes ago (mocking ${this.unix()})`;
    });
}

// Useful for getting the rendered href from any kind of link component
export async function getRenderedHref(Component: React.FC, location: Location) {
  const el = render(
    <LocationProvider
      history={
        ({
          listen: jest.fn(),
          location
        } as unknown) as History
      }
    >
      <Component />
    </LocationProvider>
  );

  await tick();
  await waitForElement(() => el.container.querySelector('a'));

  const a = el.container.querySelector('a');
  return a ? a.getAttribute('href') : '';
}

export function mockNow(date: string) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Await this when you need to "flush" promises to immediately resolve or throw in tests
export const tick = () => new Promise(resolve => setImmediate(resolve, 0));
