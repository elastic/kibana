/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Feature privilege definition
 */
export interface FeatureKibanaPrivileges {
  /**
   * Whether or not this specific privilege should be excluded from the base privileges.
   */
  excludeFromBasePrivileges?: boolean;

  /**
   * If this feature includes management sections, you can specify them here to control visibility of those
   * pages based on user privileges.
   *
   * @example
   * ```ts
   *  // Enables access to the "Advanced Settings" management page within the Kibana section
   *  management: {
   *    kibana: ['settings']
   *  }
   * ```
   */
  management?: {
    [sectionId: string]: string[];
  };

  /**
   * If this feature includes a catalogue entry, you can specify them here to control visibility based on user permissions.
   */
  catalogue?: string[];

  /**
   * If your feature includes server-side APIs, you can tag those routes to secure access based on user permissions.
   *
   * @example
   * ```ts
   *  // Configure your routes with a tag starting with the 'access:' prefix
   *  server.route({
   *    path: '/api/my-route',
   *    method: 'GET',
   *    handler: () => { ...},
   *    options: {
   *      tags: ['access:my_feature-admin']
   *    }
   *  });
   *
   *  Then, specify the tags here (without the 'access:' prefix) which should be secured:
   *
   *  {
   *    api: ['my_feature-admin']
   *  }
   * ```
   *
   * NOTE: It is important to name your tags in a way that will not collide with other plugins/features.
   * A generic tag name like "access:read" could be used elsewhere, and access to that API endpoint would also
   * extend to any routes you have also tagged with that name.
   */
  api?: string[];

  /**
   * If your feature exposes a client-side application (most of them do!), then you can control access to them here.
   *
   * @example
   * ```ts
   *  {
   *    app: ['my-app', 'kibana']
   *  }
   * ```
   *
   */
  app?: string[];

  /**
   * If your feature requires access to specific saved objects, then specify your access needs here.
   */
  savedObject: {
    /**
     * List of saved object types which users should have full read/write access to when granted this privilege.
     * @example
     * ```ts
     *  {
     *    all: ['my-saved-object-type']
     *  }
     * ```
     */
    all: string[];

    /**
     * List of saved object types which users should have read-only access to when granted this privilege.
     * @example
     * ```ts
     *  {
     *    read: ['config']
     *  }
     * ```
     */
    read: string[];
  };
  /**
   * A list of UI Capabilities that should be granted to users with this privilege.
   * These capabilities will automatically be namespaces within your feature id.
   *
   * @example
   * ```ts
   *  {
   *    ui: ['show', 'save']
   *  }
   *
   *  This translates in the UI to the following (assuming a feature id of "foo"):
   *  import { uiCapabilities } from 'ui/capabilities';
   *
   *  const canShowApp = uiCapabilities.foo.show;
   *  const canSave = uiCapabilities.foo.save;
   * ```
   * Note: Since these are automatically namespaced, you are free to use generic names like "show" and "save".
   *
   * @see UICapabilities
   */
  ui: string[];
}

export type FeatureKibanaPrivilegesSet = Record<string, FeatureKibanaPrivileges>;
