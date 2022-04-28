/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryPolicyTemplate, RegistryVarsEntry } from './epm';

// Based on https://github.com/elastic/package-spec/blob/master/versions/1/manifest.spec.yml#L8
export interface PackageSpecManifest {
  format_version: string;
  name: string;
  title: string;
  description: string;
  version: string;
  license?: 'basic';
  type?: 'integration';
  release: 'experimental' | 'beta' | 'ga';
  categories?: Array<PackageSpecCategory | undefined>;
  conditions?: PackageSpecConditions;
  icons?: PackageSpecIcon[];
  screenshots?: PackageSpecScreenshot[];
  policy_templates?: RegistryPolicyTemplate[];
  vars?: RegistryVarsEntry[];
  owner: { github: string };
}

export type PackageSpecCategory =
  | 'aws'
  | 'azure'
  | 'cloud'
  | 'config_management'
  | 'containers'
  | 'crm'
  | 'custom'
  | 'datastore'
  | 'elastic_stack'
  | 'google_cloud'
  | 'kubernetes'
  | 'languages'
  | 'message_queue'
  | 'monitoring'
  | 'network'
  | 'notification'
  | 'os_system'
  | 'productivity'
  | 'security'
  | 'support'
  | 'ticketing'
  | 'version_control'
  | 'web';

export type PackageSpecConditions = Record<
  'kibana',
  {
    version: string;
  }
>;

export interface PackageSpecIcon {
  src: string;
  title?: string;
  size?: string;
  type?: string;
}

export interface PackageSpecScreenshot {
  src: string;
  title: string;
  size?: string;
  type?: string;
  path?: string;
}
