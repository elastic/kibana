/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter, FrameworkInfo, FrameworkUser } from './adapter_types';

export class TestingFrameworkAdapter implements FrameworkAdapter {
  public get info() {
    if (this.xpackInfo) {
      return this.xpackInfo;
    } else {
      throw new Error('framework adapter must have init called before anything else');
    }
  }

  public get currentUser() {
    return this.shieldUser!;
  }
  private settings: any;
  constructor(
    private readonly xpackInfo: FrameworkInfo | null,
    private readonly shieldUser: FrameworkUser | null,
    public readonly version: string
  ) {}

  // We dont really want to have this, but it's needed to conditionaly render for k7 due to
  // when that data is needed.
  public getUISetting(key: 'k7design'): boolean {
    return this.settings[key];
  }

  public setUISettings = (key: string, value: any) => {
    this.settings[key] = value;
  };

  public async waitUntilFrameworkReady(): Promise<void> {
    return;
  }

  public registerManagementUI(settings: { sectionId?: string; name: string; order?: number }) {
    throw new Error('not yet implamented');
  }
}
