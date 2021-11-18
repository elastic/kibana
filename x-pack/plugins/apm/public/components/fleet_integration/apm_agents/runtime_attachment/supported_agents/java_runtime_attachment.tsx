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
  onChange?: () => void;
}
export function JavaRuntimeAttachment(props: Props) {
  return (
    <RuntimeAttachment
      operations={['Include', 'Exclude']}
      types={['main', 'pid']}
      onChange={(...args) => {
        if (props.onChange) {
          props.onChange(...args);
        }
      }}
      toggleDescription="Attach the Java agent to running and starting Java applications."
      discoveryRulesDescription="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs"
      showUnsavedWarning={true}
      initialDiscoveryRules={[
        {
          operation: 'Include',
          type: 'main',
          probe: 'java-opbeans-10010',
        },
        {
          operation: 'Exclude',
          type: 'pid',
          probe: '10948653898867',
        },
      ]}
    />
  );
}
