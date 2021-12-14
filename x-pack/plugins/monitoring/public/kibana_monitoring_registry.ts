/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface KibanaMonitoringSection {
  title: string;
  renderApp: (metrics: unknown) => React.FC;
}

export class KibanaMonitoringRegistry {
  private _sections: KibanaMonitoringSection[];
  constructor() {
    this._sections = [];
  }

  public add(section: KibanaMonitoringSection) {
    this._sections.push(section);
  }

  public get sections() {
    return this._sections;
  }
}
