/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Policy, PolicyFromES } from '../../../services/policies/types';
import { serializePolicy } from '../../../services/policies/policy_serialization';

interface Props {
  close: () => void;
  policy: Policy;
  existingPolicy?: PolicyFromES;
  policyName: string;
}

export const PolicyJsonFlyout: React.FunctionComponent<Props> = ({
  close,
  policy,
  policyName,
  existingPolicy,
}) => {
  const { phases } = serializePolicy(policy, existingPolicy?.policy);
  const json = JSON.stringify(
    {
      policy: {
        phases,
      },
    },
    null,
    2
  );

  const endpoint = `PUT _ilm/policy/${policyName || '<policyName>'}`;
  const request = `${endpoint}\n${json}`;

  return (
    <EuiFlyout maxWidth={480} onClose={close}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {policyName ? (
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyJsonFlyout.namedTitle"
                defaultMessage="Request for '{policyName}'"
                values={{ policyName }}
              />
            ) : (
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyJsonFlyout.unnamedTitle"
                defaultMessage="Request"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyJsonFlyout.descriptionText"
              defaultMessage="This Elasticsearch request will create or update this index lifecycle policy."
            />
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiCodeBlock language="json" isCopyable>
          {request}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={close} flush="left">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyJsonFlyout.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
