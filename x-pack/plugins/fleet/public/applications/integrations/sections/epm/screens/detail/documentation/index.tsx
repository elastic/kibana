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
  EuiLink,
  EuiBetaBadge,
} from '@elastic/eui';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type {
  PackageInfo,
  RegistryVarsEntry,
  RegistryStream,
  RegistryInput,
} from '../../../../../types';
import { useStartServices } from '../../../../../../../hooks';
import { getStreamsForInputType } from '../../../../../../../../common/services';

interface Props {
  packageInfo: PackageInfo;
  integration?: string | null;
}

export const DocumentationPage: React.FunctionComponent<Props> = ({ packageInfo, integration }) => {
  const { docLinks } = useStartServices();

  const content = (
    <>
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
        <EuiFlexItem grow={6}>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.apiReference.description"
              defaultMessage="This documents all the inputs, streams, and variables available to use this integration programmatically via the Fleet Kibana API. {learnMore}"
              values={{
                learnMore: (
                  <EuiLink href={docLinks.links.fleet.guide}>
                    <FormattedMessage
                      id="xpack.fleet.epm.packageDetails.apiReference.learnMoreLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge label="beta" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <PackageVars vars={packageInfo.vars} />

      <Inputs packageInfo={packageInfo} integration={integration} />
      <EuiSpacer size="m" />
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

const StreamsSection: React.FunctionComponent<{
  streams: RegistryInputWithStreams['streams'];
}> = ({ streams }) => {
  if (streams.length === 0) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h6>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.streamsTitle"
            defaultMessage="Streams"
          />
        </h6>
      </EuiTitle>
      <EuiSpacer size="m" />
      {streams.map((dataStream) => (
        <EuiAccordion
          key={dataStream.data_stream.type + dataStream.data_stream.dataset}
          id={dataStream.data_stream.type + dataStream.data_stream.dataset}
          buttonContent={
            <EuiText>
              <EuiCode>{dataStream.data_stream.dataset}</EuiCode>({dataStream.title})
            </EuiText>
          }
          initialIsOpen={false}
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
    </>
  );
};

const Inputs: React.FunctionComponent<{
  packageInfo: PackageInfo;
  integration?: string | null;
}> = ({ packageInfo, integration }) => {
  const inputs = useMemo(
    () =>
      packageInfo.policy_templates?.reduce((acc, policyTemplate) => {
        if (integration && policyTemplate.name !== integration) {
          return acc;
        }
        if ('inputs' in policyTemplate && policyTemplate.inputs) {
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
    [packageInfo, integration]
  );
  return (
    <>
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.inputsTitle"
            defaultMessage="Inputs"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {inputs?.map((input) => {
        return (
          <EuiAccordion
            key={input.key}
            id={input.key}
            buttonContent={
              <EuiText>
                <EuiCode>{input.key}</EuiCode>({input.title})
              </EuiText>
            }
            initialIsOpen={false}
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
            <StreamsSection streams={input.streams} />
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
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.globalVariablesTitle"
            defaultMessage="Package variables"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
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
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.columnKeyName"
            defaultMessage="Key"
          />
        ),
        render: (name: string) => <EuiCode>{name}</EuiCode>,
      },
      {
        field: 'title',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.columnTitleName"
            defaultMessage="Title"
          />
        ),
      },
      {
        field: 'type',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.columnTypeName"
            defaultMessage="Type"
          />
        ),
      },
      {
        field: 'required',
        width: '70px',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.columnRequiredName"
            defaultMessage="Required"
          />
        ),
      },
      {
        field: 'multi',
        width: '70px',
        name: (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.columnMultidName"
            defaultMessage="Multi"
          />
        ),
      },
    ];
  }, []);

  return (
    <>
      <EuiTitle size="xxs">
        <h6>
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.apiReference.variableTableTitle"
            defaultMessage="Variables"
          />
        </h6>
      </EuiTitle>
      <EuiBasicTable columns={columns} items={vars} />
    </>
  );
};
