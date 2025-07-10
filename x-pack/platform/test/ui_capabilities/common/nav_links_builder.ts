/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Features } from './features';

type BuildCallback = (featureId: string, capabilityId: string) => boolean;
export class NavLinksBuilder {
  private readonly features: Features;
  constructor(features: Features) {
    this.features = {
      ...features,
      // management isn't a first-class "feature", but it makes our life easier here to pretend like it is
      management: {
        app: ['kibana:stack_management'],
      },
      kibana: {
        app: ['kibana'],
      },
    };
  }

  public all() {
    return this.build(() => true);
  }
  public except(...features: Array<string | { feature: string; apps: string[] }>) {
    return this.build(
      (featureId, appId) =>
        !features.some((feature) =>
          typeof feature === 'string'
            ? featureId === feature
            : feature.feature === featureId && feature.apps.includes(appId)
        )
    );
  }
  public none() {
    return this.build(() => false);
  }
  public only(...features: Array<string | { feature: string; apps: string[] }>) {
    return this.build((featureId, appId) =>
      features.some((feature) =>
        typeof feature === 'string'
          ? featureId === feature
          : feature.feature === featureId && feature.apps.includes(appId)
      )
    );
  }

  private build(callback: BuildCallback): Record<string, boolean> {
    const navLinks = {} as Record<string, boolean>;
    for (const [featureId, feature] of Object.entries(this.features)) {
      feature.app.forEach((app) => {
        navLinks[app] = callback(featureId, app);
      });
    }

    return navLinks;
  }
}
