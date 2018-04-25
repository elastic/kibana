/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestTrialExtension } from '../public/sections/license_dashboard/request_trial_extension';
import { createMockLicense, getComponent } from './util';
const nonImminentExpirationTime = new Date().getTime() + (30 * 24 * 60 * 60 * 1000);
// ten days from now
const imminentExpirationTime = new Date().getTime() + (10 * 24 * 60 * 60 * 1000);

describe('RequestTrialExtension component', () => {
  test('should not display when trial expires in > 24 days', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial', nonImminentExpirationTime)
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).toBeNull();
  });
  test('should display when trial license is expired', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial', 0)
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should display when trial license is about to expire', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('trial', imminentExpirationTime)
      },
      RequestTrialExtension
    );
    const html = rendered.html();
    expect(html).not.toBeNull();
    expect(html).toMatchSnapshot();
  });
  test('should not display for about to expire basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic', imminentExpirationTime)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for expired basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic', 0)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for active basic license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('basic')
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for about to expire gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold', imminentExpirationTime)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for expired gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold', 0)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for active gold license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('gold')
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for about to expire platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', imminentExpirationTime)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for expired platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum', 0)
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
  test('should not display for active platinum license', () => {
    const rendered = getComponent(
      {
        license: createMockLicense('platinum')
      },
      RequestTrialExtension
    );
    expect(rendered.html()).toBeNull();
  });
});
