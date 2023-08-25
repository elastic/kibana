/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
  EuiTabbedContent,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';

import type { SerializedEnrichPolicy } from '../../../../../common';
import { useCreatePolicyContext } from '../create_policy_context';
import { serializeAsESPolicy, getESPolicyCreationApiCall } from '../../../../../common/lib';

const SummaryTab = ({ policy }: { policy: SerializedEnrichPolicy }) => {
  // Beyond a certain point, highlighting the syntax will bog down performance to unacceptable
  // levels. This way we prevent that happening for very large requests.
  const language = policy.query && policy?.query.length < 60000 ? 'json' : undefined;

  return (
    <>
      <EuiSpacer size="m" />

      <EuiDescriptionList>
        {/* Policy name */}
        {policy.name && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.nameLabel', {
                defaultMessage: 'Name',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyNameValue">
              {policy.name}
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy type */}
        {policy.type && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.typeLabel', {
                defaultMessage: 'Type',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyTypeValue">
              {policy.type}
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy match field */}
        {policy.matchField && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.matchFieldLabel', {
                defaultMessage: 'Match field',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyMatchFieldValue">
              {policy.matchField}
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy source indices */}
        {policy.sourceIndices && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.matchFieldLabel', {
                defaultMessage: 'Source indices',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyIndicesValue">
              <EuiText size="s">
                <ul>
                  {policy.sourceIndices.map((index: string) => (
                    <li key={index} className="eui-textBreakWord">
                      {index}
                    </li>
                  ))}
                </ul>
              </EuiText>
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy enrich fields */}
        {policy.enrichFields && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.enrichFieldsLabel', {
                defaultMessage: 'Enrich fields',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyEnrichFieldsValue">
              <EuiText size="s">
                <ul>
                  {policy.enrichFields.map((field: string) => (
                    <li key={field} className="eui-textBreakWord">
                      {field}
                    </li>
                  ))}
                </ul>
              </EuiText>
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy query */}
        {policy.query && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.queryLabel', {
                defaultMessage: 'Query',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiCodeBlock language={language} isCopyable>
                {policy.query}
              </EuiCodeBlock>
            </EuiDescriptionListDescription>
          </>
        )}
      </EuiDescriptionList>
    </>
  );
};

const RequestTab = ({ policy }: { policy: SerializedEnrichPolicy }) => {
  // Beyond a certain point, highlighting the syntax will bog down performance to unacceptable
  // levels. This way we prevent that happening for very large requests.
  const request = JSON.stringify(serializeAsESPolicy(policy), null, 2);
  const language = request.length < 60000 ? 'json' : undefined;

  return (
    <>
      <EuiSpacer size="m" />

      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicyCreate.createStep.descriptionText"
            defaultMessage="This request will create the following enrich policy."
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiCodeBlock language={language} isCopyable>
        {getESPolicyCreationApiCall(policy.name)}
        {`\n`}
        {request}
      </EuiCodeBlock>
    </>
  );
};

interface Props {
  onSubmit: () => void;
  isLoading: boolean;
}

export const CreateStep = ({ onSubmit, isLoading }: Props) => {
  const { draft } = useCreatePolicyContext();

  const summaryTabs = [
    {
      id: 'summary',
      name: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.summaryTabLabel', {
        defaultMessage: 'Summary',
      }),
      content: <SummaryTab policy={draft as SerializedEnrichPolicy} />,
    },
    {
      id: 'request',
      name: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.createStep.requestTabLabel', {
        defaultMessage: 'Request',
      }),
      content: <RequestTab policy={draft as SerializedEnrichPolicy} />,
    },
  ];

  return (
    <>
      <EuiTabbedContent tabs={summaryTabs} />

      <EuiSpacer />

      <EuiButton fill color="primary" onClick={onSubmit} isLoading={isLoading}>
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicyCreate.createStep.nextButtonLabel"
          defaultMessage="Create policy"
        />
      </EuiButton>
    </>
  );
};
