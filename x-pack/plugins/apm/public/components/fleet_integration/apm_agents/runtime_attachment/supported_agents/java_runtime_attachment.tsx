import React from 'react';
import { RuntimeAttachment } from '..';
// import {
//   NewPackagePolicy,
//   PackagePolicy,
//   PackagePolicyEditExtensionComponentProps,
// } from '../apm_policy_form/typings';

interface Props {
  // policy: PackagePolicy;
  // newPolicy: NewPackagePolicy;
  // onChange: PackagePolicyEditExtensionComponentProps['onChange'];
  onChange?: (settings: any) => void;
}

const excludeOptions = [
  { value: 'main', label: 'main class / jar name' },
  { value: 'vmarg', label: 'vmarg' },
  { value: 'user', label: 'user' },
];
const includeOptions = [{ value: 'all', label: 'All' }, ...excludeOptions];

export function JavaRuntimeAttachment(props: Props) {
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
      onChange={(...args) => {
        if (props.onChange) {
          props.onChange(...args);
        }
      }}
      toggleDescription="Attach the Java agent to running and starting Java applications."
      discoveryRulesDescription="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs"
      showUnsavedWarning={true}
      initialIsEnabled={true}
      initialDiscoveryRules={[
        {
          operation: 'include',
          type: 'main',
          probe: 'java-opbeans-10010',
        },
        {
          operation: 'exclude',
          type: 'vmarg',
          probe: '10948653898867',
        },
      ]}
    />
  );
}
