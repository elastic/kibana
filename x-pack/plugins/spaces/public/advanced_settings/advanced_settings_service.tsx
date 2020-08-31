/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import { Space } from '../../common/model/space';
import { AdvancedSettingsTitle, AdvancedSettingsSubtitle } from './components';

interface SetupDeps {
  getActiveSpace: () => Promise<Space>;
  componentRegistry: AdvancedSettingsSetup['component'];
}

export class AdvancedSettingsService {
  public setup({ getActiveSpace, componentRegistry }: SetupDeps) {
    const PageTitle = () => <AdvancedSettingsTitle getActiveSpace={getActiveSpace} />;
    const SubTitle = () => <AdvancedSettingsSubtitle getActiveSpace={getActiveSpace} />;

    componentRegistry.register(
      componentRegistry.componentType.PAGE_TITLE_COMPONENT,
      PageTitle,
      true
    );
    componentRegistry.register(
      componentRegistry.componentType.PAGE_SUBTITLE_COMPONENT,
      SubTitle,
      true
    );
  }
}
