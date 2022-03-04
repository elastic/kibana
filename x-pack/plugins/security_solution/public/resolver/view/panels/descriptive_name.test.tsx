/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { DescriptiveName } from './descriptive_name';
import { SafeResolverEvent } from '../../../../common/endpoint/types';
import { mount, ReactWrapper } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';

describe('DescriptiveName', () => {
  let generator: EndpointDocGenerator;
  let wrapper: (event: SafeResolverEvent) => ReactWrapper;
  beforeEach(() => {
    generator = new EndpointDocGenerator('seed');
    wrapper = (event: SafeResolverEvent) =>
      mount(
        <I18nProvider>
          <DescriptiveName event={event} />
        </I18nProvider>
      );
  });
  it('returns the right name for a registry event', () => {
    const extensions = { registry: { key: `HKLM/Windows/Software/abc` } };
    const event = generator.generateEvent({ eventCategory: 'registry', extensions });
    expect(wrapper(event).text()).toEqual(`HKLM/Windows/Software/abc`);
  });

  it('returns the right name for a network event', () => {
    const randomIP = `${generator.randomIP()}`;
    const extensions = { network: { direction: 'outbound', forwarded_ip: randomIP } };
    const event = generator.generateEvent({ eventCategory: 'network', extensions });
    expect(wrapper(event).text()).toEqual(`outbound ${randomIP}`);
  });

  it('returns the right name for a file event', () => {
    const extensions = { file: { path: 'C:\\My Documents\\business\\January\\processName' } };
    const event = generator.generateEvent({ eventCategory: 'file', extensions });
    expect(wrapper(event).text()).toEqual('C:\\My Documents\\business\\January\\processName');
  });

  it('returns the right name for a dns event', () => {
    const extensions = { dns: { question: { name: `${generator.randomIP()}` } } };
    const event = generator.generateEvent({ eventCategory: 'dns', extensions });
    expect(wrapper(event).text()).toEqual(extensions.dns.question.name);
  });
});
