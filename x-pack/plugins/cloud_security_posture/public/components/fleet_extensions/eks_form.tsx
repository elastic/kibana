/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiDescribedFormGroup,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiMarkdownFormat,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { i18n } from '@kbn/i18n';
import { isEksInput } from './utils';

export const eksVars = [
  {
    id: 'access_key_id',
    label: i18n.translate(
      'xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.accessKeyIdFieldLabel',
      { defaultMessage: 'Access key ID' }
    ),
  },
  {
    id: 'secret_access_key',
    label: i18n.translate(
      'xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.secretAccessKeyFieldLabel',
      { defaultMessage: 'Secret access key' }
    ),
  },
  {
    id: 'session_token',
    label: i18n.translate(
      'xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.sessionTokenFieldLabel',
      { defaultMessage: 'Session token' }
    ),
  },
] as const;

type EksVars = typeof eksVars;
type EksVarId = EksVars[number]['id'];
type EksFormVars = { [K in EksVarId]: string };

interface Props {
  onChange(key: EksVarId, value: string): void;
  inputs: NewPackagePolicyInput[];
}

const getEksVars = (input?: NewPackagePolicyInput): EksFormVars => {
  const vars = input?.streams?.[0]?.vars;
  return {
    access_key_id: vars?.access_key_id.value || '',
    secret_access_key: vars?.secret_access_key.value || '',
    session_token: vars?.session_token.value || '',
  };
};

export const EksFormWrapper = ({ onChange, inputs }: Props) => (
  <>
    <EuiSpacer size="m" />
    <EksForm inputs={inputs} onChange={onChange} />
  </>
);

const EksForm = ({ onChange, inputs }: Props) => {
  const values = getEksVars(inputs.find(isEksInput));

  const eksFormTitle = (
    <h4>
      <FormattedMessage
        id="xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.awsCredentialsTitle"
        defaultMessage="AWS Credentials"
      />
    </h4>
  );

  const eksFormDescription = (
    <>
      <FormattedMessage
        id="xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.awsCredentialsDescription"
        defaultMessage={`In order to run some of the rules in the benchmark, we need elevated access. You can follow {link} to create an IAM user with programmatic access that is associated with a policy with the set of permissions captured in the table below. You can either create a new policy or append these service permissions to an existing one- we recommend creating a new one.`}
        values={{
          // TODO: add link
          link: (
            <EuiLink
              href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.awsCredentialsInstructionsLink"
                defaultMessage="these instructions"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer />
      <FormattedMessage
        id="xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.awsCredentialsNote"
        defaultMessage="If you choose not to provide credentials, only a subset of the benchmark rules will be evaluated against your cluster(s)."
      />
    </>
  );

  return (
    <div>
      <EuiDescribedFormGroup title={eksFormTitle} description={eksFormDescription}>
        {eksVars.map((field) => (
          <EuiFormRow
            key={field.id}
            label={field.label}
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.csp.createPackagePolicy.eksIntegrationSettingsSection.optionalField"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
          >
            <EuiFieldText
              value={values[field.id]}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          </EuiFormRow>
        ))}
      </EuiDescribedFormGroup>
      <EuiMarkdownFormat textSize="xs" textAlign="left" grow={false} style={{ textAlign: 'left' }}>
        {`| Service                           | Permissions |
| --------------------------------- | ----------- |
| EKS                               | List, Read  |
| Elastic Container Registry        | List, Read  |
| Elastic Container Registry Public | List, Read  |
| ELB                               | List, Read  |
| ELB v2                            | Read        | `}
      </EuiMarkdownFormat>
      <EuiSpacer size="xl" />
    </div>
  );
};
