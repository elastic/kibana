/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { SerializedPolicy } from '../../../../../common/types';

import { useFormContext, useFormData } from '../../../../shared_imports';
import { FormInternal } from '../types';

interface Props {
  legacyPolicy: SerializedPolicy;
  close: () => void;
  policyName: string;
}

export const PolicyJsonFlyout: React.FunctionComponent<Props> = ({
  policyName,
  close,
  legacyPolicy,
}) => {
  /**
   * policy === undefined: we are checking validity
   * policy === null: we have determined the policy is invalid
   * policy === {@link SerializedPolicy} we have determined the policy is valid
   */
  const [policy, setPolicy] = useState<undefined | null | SerializedPolicy>(undefined);

  const { validate: validateForm } = useFormContext();
  const [, getFormData] = useFormData<FormInternal>();

  const updatePolicy = useCallback(async () => {
    setPolicy(undefined);
    if (await validateForm()) {
      const p = getFormData() as SerializedPolicy;
      setPolicy({
        ...legacyPolicy,
        phases: {
          ...legacyPolicy.phases,
          hot: p.phases.hot,
          warm: p.phases.warm,
          cold: p.phases.cold,
        },
      });
    } else {
      setPolicy(null);
    }
  }, [setPolicy, getFormData, legacyPolicy, validateForm]);

  useEffect(() => {
    updatePolicy();
  }, [updatePolicy]);

  let content: React.ReactNode;
  switch (policy) {
    case undefined:
      content = <EuiLoadingSpinner />;
      break;
    case null:
      content = (
        <EuiCallOut
          iconType="alert"
          color="danger"
          title={i18n.translate(
            'xpack.indexLifecycleMgmt.policyJsonFlyout.validationErrorCallout.title',
            { defaultMessage: 'Invalid policy' }
          )}
        >
          {i18n.translate('xpack.indexLifecycleMgmt.policyJsonFlyout.validationErrorCallout.body', {
            defaultMessage: 'To view the JSON for this policy address all validation errors.',
          })}
        </EuiCallOut>
      );
      break;
    default:
      const { phases } = policy;

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
      content = (
        <>
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
        </>
      );
      break;
  }

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

      <EuiFlyoutBody>{content}</EuiFlyoutBody>

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
