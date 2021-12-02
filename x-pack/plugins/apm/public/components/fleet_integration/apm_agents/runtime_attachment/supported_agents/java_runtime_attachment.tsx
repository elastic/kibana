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
  { value: 'main', label: 'main class / jar name' },
  { value: 'vmarg', label: 'vmarg' },
  { value: 'user', label: 'user' },
];
const includeOptions = [{ value: 'all', label: 'All' }, ...excludeOptions];

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
              },
            },
            ...newPolicy.inputs.slice(apmInputIdx + 1),
          ],
        },
      });
      setIsDirty(true);
    },
    [newPolicy]
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
    />
  );
}

const initialDiscoveryRule = { 'include-vmarg': 'elastic.apm.attach=true' };
