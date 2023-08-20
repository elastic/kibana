/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { firstValueFrom } from 'rxjs';
import { SecurityPageName } from '../../../../common';
import { UpsellingService } from './upselling_service';

const TestComponent = () => <div>{'TEST component'}</div>;

describe('UpsellingService', () => {
  it('registers sections', async () => {
    const service = new UpsellingService();
    service.setSections({
      entity_analytics_panel: TestComponent,
    });

    const value = await firstValueFrom(service.sections$);

    expect(value.get('entity_analytics_panel')).toEqual(TestComponent);
  });

  it('overwrites registered sections when called twice', async () => {
    const service = new UpsellingService();
    service.setSections({
      entity_analytics_panel: TestComponent,
    });

    service.setSections({
      osquery_automated_response_actions: TestComponent,
    });

    const value = await firstValueFrom(service.sections$);

    expect(Array.from(value.keys())).toEqual(['osquery_automated_response_actions']);
  });

  it('registers pages', async () => {
    const service = new UpsellingService();
    service.setPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    const value = await firstValueFrom(service.pages$);

    expect(value.get(SecurityPageName.hosts)).toEqual(TestComponent);
  });

  it('overwrites registered pages when called twice', async () => {
    const service = new UpsellingService();
    service.setPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    service.setPages({
      [SecurityPageName.users]: TestComponent,
    });

    const value = await firstValueFrom(service.pages$);

    expect(Array.from(value.keys())).toEqual([SecurityPageName.users]);
  });

  it('registers messages', async () => {
    const testMessage = 'test message';
    const service = new UpsellingService();
    service.setMessages({
      investigation_guide: testMessage,
    });

    const value = await firstValueFrom(service.messages$);

    expect(value.get('investigation_guide')).toEqual(testMessage);
  });

  it('overwrites registered messages when called twice', async () => {
    const testMessage = 'test message';
    const service = new UpsellingService();
    service.setMessages({
      investigation_guide: testMessage,
    });

    service.setMessages({});

    const value = await firstValueFrom(service.messages$);

    expect(Array.from(value.keys())).toEqual([]);
  });

  it('"isPageUpsellable" returns true when page is upsellable', () => {
    const service = new UpsellingService();
    service.setPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    expect(service.isPageUpsellable(SecurityPageName.hosts)).toEqual(true);
  });

  it('"getPageUpselling" returns page component when page is upsellable', () => {
    const service = new UpsellingService();
    service.setPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    expect(service.getPageUpselling(SecurityPageName.hosts)).toEqual(TestComponent);
  });
});
