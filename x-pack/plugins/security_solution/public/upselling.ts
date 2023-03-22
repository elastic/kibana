/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class UpsellingService {
  private components = new Map<string, React.Component>();

  public set(id: string, component: React.Component) {
    this.components.set(id, component);
  }

  public setComponents(components: Record<string, React.Component>) {
    Object.entries(components).forEach(([id, component]) => {
      this.set(id, component);
    });
  }

  public get(id: string) {
    return this.components.get(id);
  }

  public exists(id: string) {
    return this.components.has(id);
  }

  public isLinkUpgradable(linkId: string) {
    return this.exists(`link-${linkId}`);
  }
}
