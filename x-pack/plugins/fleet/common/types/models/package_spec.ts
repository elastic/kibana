/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryPolicyTemplate } from './epm';

export interface PackageSpecManifest {
  format_version: string;
  name: string;
  title: string;
  description: string;
  version: string;
  license: 'basic';
  type: 'integration';
  release: 'experimental' | 'beta' | 'ga';
  categories: Array<PackageSpecCategory | undefined>;
  conditions: PackageSpecConditions;
  icons?: PackageSpecIcon[];
  screenshots?: PackageSpecScreenshot[];
  policy_templates?: RegistryPolicyTemplate[];
  owner: { github: string };
}

type PackageSpecCategory =
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

type PackageSpecConditions = Record<
  'kibana',
  {
    version: string;
  }
>;

interface PackageSpecIcon {
  src: string;
  title?: string;
  size?: string;
  type?: string;
}

interface PackageSpecScreenshot {
  src: string;
  title: string;
  size?: string;
  type?: string;
}
