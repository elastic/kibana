/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { GoogleLink } from './google_link';

describe('GoogleLink', () => {
  test('it renders text passed in as value', () => {
    const wrapper = mountWithIntl(
      <GoogleLink link={'http:/example.com/'} value={'Example Link'} />
    );
    expect(wrapper.text()).toEqual('Example Link');
  });

  test('it renders props passed in as link', () => {
    const wrapper = mountWithIntl(
      <GoogleLink link={'http:/example.com/'} value={'Example Link'} />
    );
    expect(wrapper.find('a').prop('href')).toEqual(
      'https://www.google.com/search?q=http:/example.com/'
    );
  });

  test("it encodes <script>alert('XSS')</script>", () => {
    const wrapper = mountWithIntl(
      <GoogleLink
        link={"http:/example.com?q=<script>alert('XSS')</script>"}
        value={'Example Link'}
      />
    );
    expect(wrapper.find('a').prop('href')).toEqual(
      "https://www.google.com/search?q=http:/example.com?q=%3Cscript%3Ealert('XSS')%3C/script%3E"
    );
  });
});
