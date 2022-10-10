/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { DescriptiveName } from './descriptive_name';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';

describe('DescriptiveName', () => {
  const generator = new EndpointDocGenerator('seed');

  function renderEvent(event: SafeResolverEvent) {
    render(
      <I18nProvider>
        <DescriptiveName event={event} />
      </I18nProvider>
    );
  }

  it('returns the right name for a registry event', () => {
    const extensions = { registry: { key: `HKLM/Windows/Software/abc` } };
    renderEvent(generator.generateEvent({ eventCategory: 'registry', extensions }));
    expect(screen.queryByText('HKLM/Windows/Software/abc')).toBeInTheDocument();
  });

  it('returns the right name for a network event', () => {
    const randomIP = `${generator.randomIP()}`;
    const extensions = { network: { direction: 'outbound', forwarded_ip: randomIP } };
    renderEvent(generator.generateEvent({ eventCategory: 'network', extensions }));
    expect(screen.queryByText(`outbound ${randomIP}`)).toBeInTheDocument();
  });

  it('returns the right name for a file event', () => {
    const extensions = { file: { path: 'C:\\My Documents\\business\\January\\processName' } };
    renderEvent(generator.generateEvent({ eventCategory: 'file', extensions }));
    expect(
      screen.queryByText('C:\\My Documents\\business\\January\\processName')
    ).toBeInTheDocument();
  });

  it('returns the right name for a dns event', () => {
    const extensions = { dns: { question: { name: `${generator.randomIP()}` } } };
    renderEvent(generator.generateEvent({ eventCategory: 'dns', extensions }));
    expect(screen.queryByText(extensions.dns.question.name)).toBeInTheDocument();
  });
});
