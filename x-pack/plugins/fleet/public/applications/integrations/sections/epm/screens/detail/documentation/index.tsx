/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiInMemoryTableProps } from '@elastic/eui';

import type {
  PackageInfo,
  RegistryVarsEntry,
  RegistryStream,
  RegistryInput,
} from '../../../../../types';
import { getStreamsForInputType } from '../../../../../../../../common/services';

interface Props {
  packageInfo: PackageInfo;
}

export const DocumentationPage: React.FunctionComponent<Props> = ({ packageInfo }) => {
  const content = (
    <>
      <PackageVars vars={packageInfo.vars} />
      <PolicyTemplates packageInfo={packageInfo} />
    </>
  );

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>{content}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

type RegistryInputWithStreams = RegistryInput & {
  key: string;
  streams: Array<RegistryStream & { data_stream: { type: string; dataset: string } }>;
};

const PolicyTemplates: React.FunctionComponent<{ packageInfo: PackageInfo }> = ({
  packageInfo,
}) => {
  const inputs = useMemo(
    () =>
      packageInfo.policy_templates?.reduce((acc, policyTemplate) => {
        // TODO support integration
        if (policyTemplate.inputs) {
          return [
            ...acc,
            ...policyTemplate.inputs.map((input) => ({
              key: `${policyTemplate.name}-${input.type}`,
              ...input,
              streams: getStreamsForInputType(input.type, packageInfo, []),
            })),
          ];
        }
        return acc;
      }, [] as RegistryInputWithStreams[]),
    [packageInfo]
  );
  return (
    <>
      <EuiText>
        That tab document all the inputs and datastreams available to programatically create a
        package policy from that integration using Fleet Rest API, see doc for more info.
      </EuiText>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h4>Inputs</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {inputs?.map((input) => {
        return (
          <EuiAccordion
            key={input.key}
            id={input.key}
            buttonContent={
              <>
                <EuiCode>{input.key}</EuiCode>({input.title})
              </>
            }
            initialIsOpen={true}
            paddingSize={'m'}
          >
            <EuiText>{input.description}</EuiText>
            {input.vars ? (
              <>
                <EuiSpacer size="m" />
                <VarsTable vars={input.vars} />
              </>
            ) : null}
            <EuiSpacer size="m" />
            <EuiTitle size="xs">
              <h6>Datastreams</h6>
            </EuiTitle>
            <EuiSpacer size="m" />
            {input.streams.map((dataStream) => (
              <EuiAccordion
                key={dataStream.data_stream.type + dataStream.data_stream.dataset}
                id={dataStream.data_stream.type + dataStream.data_stream.dataset}
                buttonContent={
                  <>
                    <EuiCode>{dataStream.data_stream.dataset}</EuiCode>({dataStream.title})
                  </>
                }
                initialIsOpen={true}
                paddingSize={'m'}
              >
                <EuiText>{dataStream.description}</EuiText>
                {dataStream.vars ? (
                  <>
                    <EuiSpacer size="m" />
                    <VarsTable vars={dataStream.vars} />
                  </>
                ) : null}
              </EuiAccordion>
            ))}
            {/* {JSON.stringify(dataStreams)} */}
            {/* {packageInfo.data_streams?.filter(ds => ds.)} */}
          </EuiAccordion>
        );
      }) ?? null}
    </>
  );
};

const PackageVars: React.FunctionComponent<{ vars: PackageInfo['vars'] }> = ({ vars }) => {
  if (!vars) {
    return null;
  }

  return (
    <>
      <EuiTitle size="s">
        <h4>Package variables</h4>
      </EuiTitle>
      <VarsTable vars={vars} />
      <EuiSpacer size="m" />
    </>
  );
};

const VarsTable: React.FunctionComponent<{ vars: RegistryVarsEntry[] }> = ({ vars }) => {
  const columns = useMemo((): EuiInMemoryTableProps<RegistryVarsEntry>['columns'] => {
    return [
      {
        field: 'name',
        name: 'key',
        render: (name: string) => <EuiCode>{name}</EuiCode>,
      },
      {
        field: 'title',
        name: 'title',
      },
      {
        field: 'type',
        name: 'type',
      },
      {
        field: 'required',
        name: 'required',
      },
      {
        field: 'multi',
        name: 'multi',
      },
    ];
  }, []);

  return (
    <>
      <EuiTitle size="xxs">
        <h6>Variables</h6>
      </EuiTitle>
      <EuiBasicTable columns={columns} items={vars} />
    </>
  );
};
