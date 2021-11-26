/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

import { i18nTexts } from '../i18n_texts';
import { FormInternal } from '../types';

type PolicyJson = Omit<SerializedPolicy, 'name'>;
interface Props {
  close: () => void;
  policyName: string;
}

/**
 * Ensure that the JSON we get from the from has phases in the correct order.
 */
const prettifyFormJson = (policy: SerializedPolicy): PolicyJson => {
  return {
    phases: {
      hot: policy.phases.hot,
      warm: policy.phases.warm,
      cold: policy.phases.cold,
      frozen: policy.phases.frozen,
      delete: policy.phases.delete,
    },
    _meta: policy._meta,
  };
};

export const PolicyJsonFlyout: React.FunctionComponent<Props> = ({ policyName, close }) => {
  /**
   * policy === undefined: we are checking validity
   * policy === null: we have determined the policy is invalid
   * policy === {@link PolicyJson} we have determined the policy is valid
   */
  const [policyJson, setPolicyJson] = useState<undefined | null | PolicyJson>(undefined);

  const { validate: validateForm, getErrors } = useFormContext();
  const [, getFormData] = useFormData<FormInternal>();

  const updatePolicy = useCallback(async () => {
    setPolicyJson(undefined);
    const isFormValid = await validateForm();
    const errorMessages = getErrors();
    const isOnlyMissingPolicyName =
      errorMessages.length === 1 &&
      errorMessages[0] === i18nTexts.editPolicy.errors.policyNameRequiredMessage;
    if (isFormValid || isOnlyMissingPolicyName) {
      setPolicyJson(prettifyFormJson(getFormData()));
    } else {
      setPolicyJson(null);
    }
  }, [setPolicyJson, getFormData, validateForm, getErrors]);

  useEffect(() => {
    updatePolicy();
  }, [updatePolicy]);

  let content: React.ReactNode;
  switch (policyJson) {
    case undefined:
      content = <EuiLoadingSpinner />;
      break;
    case null:
      content = (
        <EuiCallOut
          data-test-subj="policyRequestInvalidAlert"
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
      const json = JSON.stringify(
        {
          policy: {
            ...policyJson,
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
          <EuiCodeBlock language="json" isCopyable data-test-subj="policyRequestJson">
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
        <EuiButtonEmpty
          iconType="cross"
          onClick={close}
          flush="left"
          data-test-subj="policyRequestClose"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyJsonFlyout.closeButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
