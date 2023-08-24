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
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.nameTitle', {
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
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.typeTitle', {
                defaultMessage: 'Type',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyTypeValue">
              {policy.type}
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy source indices */}
        {policy.sourceIndices && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.sourceIndicesTitle', {
                defaultMessage: 'Source indices',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyIndicesValue">
              <span className="eui-textBreakWord">{policy.sourceIndices.join(', ')}</span>
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy match field */}
        {policy.matchField && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.matchFieldTitle', {
                defaultMessage: 'Match field',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyMatchFieldValue">
              {policy.matchField}
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy enrich fields */}
        {policy.enrichFields && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.enrichFieldsTitle', {
                defaultMessage: 'Enrich fields',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="policyEnrichFieldsValue">
              <span className="eui-textBreakWord">{policy.enrichFields.join(', ')}</span>
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Policy query */}
        {policy.query && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.idxMgmt.enrich_policies.detailsFlyout.queryTitle', {
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
            id="xpack.idxMgmt.enrichPolicies.create.stepCreate.requestTab.descriptionText"
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
}

export const CreateStep = ({ onSubmit }: Props) => {
  const { draft } = useCreatePolicyContext();

  const summaryTabs = [
    {
      id: 'summary',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.create.stepCreate.summaryTabTitle', {
        defaultMessage: 'Summary',
      }),
      content: <SummaryTab policy={draft as SerializedEnrichPolicy} />,
    },
    {
      id: 'request',
      name: i18n.translate('xpack.idxMgmt.enrichPolicies.create.stepCreate.requestTabTitle', {
        defaultMessage: 'Request',
      }),
      content: <RequestTab policy={draft as SerializedEnrichPolicy} />,
    },
  ];

  return (
    <>
      <EuiTabbedContent tabs={summaryTabs} />

      <EuiSpacer />

      <EuiButton fill color="primary" onClick={onSubmit}>
        <FormattedMessage
          id="xpack.idxMgmt.enrichPolicies.create.stepCreate.createButtonLabel"
          defaultMessage="Create policy"
        />
      </EuiButton>
    </>
  );
};
