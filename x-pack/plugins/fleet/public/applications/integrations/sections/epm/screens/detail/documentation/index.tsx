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
} from '@elastic/eui';
import type { EuiInMemoryTableProps } from '@elastic/eui';

import type { PackageInfo, RegistryVarsEntry } from '../../../../../types';
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

const PolicyTemplates: React.FunctionComponent<{ packageInfo: PackageInfo }> = ({
  packageInfo,
}) => {
  return (
    <>
      <EuiTitle size="s">
        <h4>Policy templates</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {packageInfo.policy_templates?.map((policyTemplate) => (
        <EuiAccordion
          key={policyTemplate.title}
          id={policyTemplate.title}
          buttonContent={policyTemplate.title}
          initialIsOpen={true}
          paddingSize={'m'}
        >
          <p>
            policy_template: <EuiCode>{policyTemplate.name}</EuiCode>
          </p>
          <p>{policyTemplate.description}</p>
          <EuiTitle size="xs">
            <h6>Inputs</h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          {policyTemplate.inputs?.map((input) => {
            const dataStreams = getStreamsForInputType(
              input.type,
              packageInfo,
              policyTemplate.data_streams
            );

            return (
              <EuiAccordion
                key={input.type}
                id={input.type}
                buttonContent={input.title}
                initialIsOpen={true}
                paddingSize={'m'}
              >
                Type: <EuiCode>{input.type}</EuiCode>
                <p>{input.description}</p>
                Inputs vars:
                {input.vars ? <VarsTable vars={input.vars} /> : null}
                {/* {input.} */}
                <br />
                <EuiTitle size="xs">
                  <h6>Datastreams</h6>
                </EuiTitle>
                {dataStreams.map((dataStream) => (
                  <EuiAccordion
                    key={dataStream.data_stream.type + dataStream.data_stream.dataset}
                    id={dataStream.data_stream.type + dataStream.data_stream.dataset}
                    buttonContent={dataStream.title}
                    initialIsOpen={true}
                    paddingSize={'m'}
                  >
                    <p>
                      datastream type: <EuiCode>{dataStream.data_stream.type}</EuiCode>
                    </p>
                    <p>
                      datastream dataset: <EuiCode>{dataStream.data_stream.dataset}</EuiCode>
                    </p>
                    Stream vars:
                    {dataStream.vars ? <VarsTable vars={dataStream.vars} /> : null}
                  </EuiAccordion>
                ))}
                {/* {JSON.stringify(dataStreams)} */}
                {/* {packageInfo.data_streams?.filter(ds => ds.)} */}
              </EuiAccordion>
            );
          }) ?? null}
        </EuiAccordion>
      ))}
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

  return <EuiBasicTable columns={columns} items={vars} />;
};
