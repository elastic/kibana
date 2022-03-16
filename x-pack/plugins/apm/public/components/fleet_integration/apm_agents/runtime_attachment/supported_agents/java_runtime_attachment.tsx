/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState, useMemo } from 'react';
import {
  RuntimeAttachment,
  RuntimeAttachmentSettings,
  IDiscoveryRule,
} from '..';
import type {
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
    label: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.main',
      { defaultMessage: 'main' }
    ),
    description: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.mainDescription',
      {
        defaultMessage:
          'A regular expression of fully qualified main class names or paths to JARs of applications the java agent should be attached to. Performs a partial match so that foo matches /bin/foo.jar.',
      }
    ),
  },
  {
    value: 'vmarg',
    label: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.vmarg',
      { defaultMessage: 'vmarg' }
    ),
    description: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.vmargDescription',
      {
        defaultMessage:
          'A regular expression matched against the arguments passed to the JVM, such as system properties. Performs a partial match so that attach=true matches the system property -Dattach=true.',
      }
    ),
  },
  {
    value: 'user',
    label: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.user',
      { defaultMessage: 'user' }
    ),
    description: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude.options.userDescription',
      {
        defaultMessage:
          'A username that is matched against the operating system user that runs the JVM.',
      }
    ),
  },
];
const includeOptions = [
  {
    value: 'all',
    label: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.include.options.all',
      { defaultMessage: 'All' }
    ),
    description: i18n.translate(
      'xpack.apm.fleetIntegration.javaRuntime.operationType.include.options.allDescription',
      { defaultMessage: 'Includes all JVMs for attachment.' }
    ),
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

function getApmVars(newPolicy: NewPackagePolicy) {
  return newPolicy.inputs.find(({ type }) => type === 'apm')?.vars;
}

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
                  value: encodeDiscoveryRulesYaml(
                    runtimeAttachmentSettings.discoveryRules
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

  const apmVars = useMemo(() => getApmVars(newPolicy), [newPolicy]);

  return (
    <RuntimeAttachment
      operationTypes={[
        {
          operation: {
            value: 'include',
            label: i18n.translate(
              'xpack.apm.fleetIntegration.javaRuntime.operationType.include',
              { defaultMessage: 'Include' }
            ),
          },
          types: includeOptions,
        },
        {
          operation: {
            value: 'exclude',
            label: i18n.translate(
              'xpack.apm.fleetIntegration.javaRuntime.operationType.exclude',
              { defaultMessage: 'Exclude' }
            ),
          },
          types: excludeOptions,
        },
      ]}
      onChange={onChangePolicy}
      toggleDescription={i18n.translate(
        'xpack.apm.fleetIntegration.javaRuntime.toggleDescription',
        {
          defaultMessage:
            'Attach the Java agent to running and starting Java applications.',
        }
      )}
      discoveryRulesDescription={
        <FormattedMessage
          id="xpack.apm.fleetIntegration.javaRuntime.discoveryRulesDescription"
          defaultMessage="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the {docLink}."
          values={{
            docLink: (
              <a
                href="https://www.elastic.co/guide/en/apm/agent/java/current/setup-attach-cli.html"
                target="_blank"
              >
                {i18n.translate(
                  'xpack.apm.fleetIntegration.javaRuntime.discoveryRulesDescription.docLink',
                  { defaultMessage: 'docs' }
                )}
              </a>
            ),
          }}
        />
      }
      showUnsavedWarning={isDirty}
      initialIsEnabled={apmVars?.java_attacher_enabled?.value}
      initialDiscoveryRules={decodeDiscoveryRulesYaml(
        apmVars?.java_attacher_discovery_rules?.value ?? '[]\n',
        [initialDiscoveryRule]
      )}
      selectedVersion={
        apmVars?.java_attacher_agent_version?.value || versions[0]
      }
      versions={versions}
    />
  );
}

const initialDiscoveryRule = {
  operation: 'include',
  type: 'vmarg',
  probe: 'elastic.apm.attach=true',
};

type DiscoveryRulesParsedYaml = Array<{ [operationType: string]: string }>;

function decodeDiscoveryRulesYaml(
  discoveryRulesYaml: string,
  defaultDiscoveryRules: IDiscoveryRule[] = []
): IDiscoveryRule[] {
  try {
    const parsedYaml: DiscoveryRulesParsedYaml =
      yaml.load(discoveryRulesYaml) ?? [];

    if (parsedYaml.length === 0) {
      return defaultDiscoveryRules;
    }

    // transform into array of discovery rules
    return parsedYaml.map((discoveryRuleMap) => {
      const [operationType, probe] = Object.entries(discoveryRuleMap)[0];
      return {
        operation: operationType.split('-')[0],
        type: operationType.split('-')[1],
        probe,
      };
    });
  } catch (error) {
    return defaultDiscoveryRules;
  }
}

function encodeDiscoveryRulesYaml(discoveryRules: IDiscoveryRule[]): string {
  // transform into list of key,value objects for expected yaml result
  const mappedDiscoveryRules: DiscoveryRulesParsedYaml = discoveryRules.map(
    ({ operation, type, probe }) => ({
      [`${operation}-${type}`]: probe,
    })
  );
  return yaml.dump(mappedDiscoveryRules);
}
