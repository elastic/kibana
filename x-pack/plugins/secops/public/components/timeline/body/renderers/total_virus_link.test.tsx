/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TotalVirusLink } from './total_virus_link';

describe('TotalVirusLink', () => {
  test('it renders sha passed in as value', () => {
    const wrapper = mountWithIntl(<TotalVirusLink sha={'abc'} value={'Example Link'} />);
    expect(wrapper.text()).toEqual('Example Link');
  });

  test('it renders sha passed in as link', () => {
    const wrapper = mountWithIntl(<TotalVirusLink sha={'abc'} value={'Example Link'} />);
    expect(wrapper.find('a').prop('href')).toEqual('https://www.virustotal.com/#/search/abc');
  });

  test("it encodes <script>alert('XSS')</script>", () => {
    const wrapper = mountWithIntl(
      <TotalVirusLink sha={"<script>alert('XSS')</script>"} value={'Example Link'} />
    );
    expect(wrapper.find('a').prop('href')).toEqual(
      "https://www.virustotal.com/#/search/%3Cscript%3Ealert('XSS')%3C/script%3E"
    );
  });
});
