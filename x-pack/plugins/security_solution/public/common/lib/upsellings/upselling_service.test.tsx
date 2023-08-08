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
    service.registerSections({
      entity_analytics_panel: TestComponent,
    });

    const value = await firstValueFrom(service.sections$);

    expect(value.get('entity_analytics_panel')).toEqual(TestComponent);
  });

  it('registers pages', async () => {
    const service = new UpsellingService();
    service.registerPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    const value = await firstValueFrom(service.pages$);

    expect(value.get(SecurityPageName.hosts)).toEqual(TestComponent);
  });

  it('registers messages', async () => {
    const testMessage = 'test message';
    const service = new UpsellingService();
    service.registerMessages({
      investigation_guide: testMessage,
    });

    const value = await firstValueFrom(service.messages$);

    expect(value.get('investigation_guide')).toEqual(testMessage);
  });

  it('"isPageUpsellable" returns true when page is upsellable', () => {
    const service = new UpsellingService();
    service.registerPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    expect(service.isPageUpsellable(SecurityPageName.hosts)).toEqual(true);
  });

  it('"getPageUpselling" returns page component when page is upsellable', () => {
    const service = new UpsellingService();
    service.registerPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    expect(service.getPageUpselling(SecurityPageName.hosts)).toEqual(TestComponent);
  });
});
