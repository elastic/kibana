/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { RuntimeAttachment, RuntimeAttachmentSettings } from '..';
import {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyEditExtensionComponentProps,
} from '../../../apm_policy_form/typings';

interface Props {
  policy: PackagePolicy;
  newPolicy: NewPackagePolicy;
  onChange: PackagePolicyEditExtensionComponentProps['onChange'];
}

const excludeOptions = [
  {
    value: 'main',
    label: 'main',
    description:
      'A regular expression of fully qualified main class names or paths to JARs of applications the java agent should be attached to. Performs a partial match so that foo matches /bin/foo.jar.',
  },
  {
    value: 'vmarg',
    label: 'vmarg',
    description:
      'A regular expression matched against the arguments passed to the JVM, such as system properties. Performs a partial match so that attach=true matches the system property -Dattach=true.',
  },
  {
    value: 'user',
    label: 'user',
    description:
      'A username that is matched against the operating system user that runs the JVM. For included users, make sure that the Elastic Agent user is either the same user or has permissions to switch to the user that runs the target JVM.',
  },
];
const includeOptions = [
  {
    value: 'all',
    label: 'All',
    description: 'Includes all JVMs for attachment.',
  },
  ...excludeOptions,
];

const versions = [
  '1.27.1',
  '1.27.0',
  '1.26.0',
  '1.25.0',
  '1.24.0',
  '1.23.0',
  '1.22.0',
  '1.21.0',
  '1.20.0',
  '1.19.0',
  '1.18.1',
  '1.18.0',
  '1.18.0.RC1',
  '1.17.0',
  '1.16.0',
  '1.15.0',
  '1.14.0',
  '1.13.0',
  '1.12.0',
  '1.11.0',
  '1.10.0',
  '1.9.0',
  '1.8.0',
  '1.7.0',
  '1.6.1',
  '1.6.0',
  '1.5.0',
  '1.4.0',
  '1.3.0',
  '1.2.0',
];

export function JavaRuntimeAttachment({ newPolicy, onChange }: Props) {
  const [isDirty, setIsDirty] = useState(false);
  const onChangePolicy = useCallback(
    (runtimeAttachmentSettings: RuntimeAttachmentSettings) => {
      const apmInputIdx = newPolicy.inputs.findIndex(
        ({ type }) => type === 'apm'
      );
      onChange({
        isValid: true,
        updatedPolicy: {
          ...newPolicy,
          inputs: [
            ...newPolicy.inputs.slice(0, apmInputIdx),
            {
              ...newPolicy.inputs[apmInputIdx],
              vars: {
                ...newPolicy.inputs[apmInputIdx].vars,
                java_attacher_enabled: {
                  value: runtimeAttachmentSettings.enabled,
                  type: 'bool',
                },
                java_attacher_discovery_rules: {
                  type: 'yaml',
                  value: runtimeAttachmentSettings.discoveryRules.map(
                    ({ operation, type, probe }) => ({
                      [`${operation}-${type}`]: probe,
                    })
                  ),
                },
                java_attacher_agent_version: {
                  type: 'text',
                  value: runtimeAttachmentSettings.version,
                },
              },
            },
            ...newPolicy.inputs.slice(apmInputIdx + 1),
          ],
        },
      });
      setIsDirty(true);
    },
    [newPolicy, onChange]
  );
  return (
    <RuntimeAttachment
      operationTypes={[
        {
          operation: { value: 'include', label: 'Include' },
          types: includeOptions,
        },
        {
          operation: { value: 'exclude', label: 'Exclude' },
          types: excludeOptions,
        },
      ]}
      onChange={onChangePolicy}
      toggleDescription="Attach the Java agent to running and starting Java applications."
      discoveryRulesDescription="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs."
      showUnsavedWarning={isDirty}
      initialIsEnabled={
        newPolicy.inputs.find(({ type }) => type === 'apm')?.vars
          ?.java_attacher_enabled?.value
      }
      initialDiscoveryRules={(
        newPolicy.inputs.find(({ type }) => type === 'apm')?.vars
          ?.java_attacher_discovery_rules?.value ?? [initialDiscoveryRule]
      ).map((discoveryRuleMap: Record<string, string>) => {
        const [operationType, probe] = Object.entries(discoveryRuleMap)[0];
        return {
          operation: operationType.split('-')[0],
          type: operationType.split('-')[1],
          probe,
        };
      })}
      selectedVersion={versions[0]}
      versions={versions}
    />
  );
}

const initialDiscoveryRule = { 'include-vmarg': 'elastic.apm.attach=true' };
