/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryElasticsearch, RegistryPolicyTemplate, RegistryVarsEntry } from './epm';

// Based on https://github.com/elastic/package-spec/blob/master/versions/1/manifest.spec.yml#L8
export interface PackageSpecManifest {
  format_version: string;
  name: string;
  title: string;
  description: string;
  version: string;
  license?: 'basic';
  source?: {
    license: string;
  };
  type?: 'integration' | 'input';
  release?: 'experimental' | 'beta' | 'ga';
  categories?: Array<PackageSpecCategory | undefined>;
  conditions?: PackageSpecConditions;
  icons?: PackageSpecIcon[];
  screenshots?: PackageSpecScreenshot[];
  policy_templates?: RegistryPolicyTemplate[];
  vars?: RegistryVarsEntry[];
  owner: { github: string };
  elasticsearch?: Pick<
    RegistryElasticsearch,
    'index_template.settings' | 'index_template.mappings'
  >;
}

export type PackageSpecPackageType = 'integration' | 'input';

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
  | 'infrastructure'
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
  | 'threat_intel'
  | 'ticketing'
  | 'version_control'
  | 'web';

export interface PackageSpecConditions {
  kibana: {
    version: string;
  };
  elastic?: {
    subscription: string;
  };
}

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
