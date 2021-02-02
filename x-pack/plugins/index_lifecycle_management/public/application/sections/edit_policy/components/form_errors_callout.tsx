/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { useFormErrorsContext } from '../form';

const i18nTexts = {
  callout: {
    title: i18n.translate('xpack.indexLifecycleMgmt.policyErrorCalloutTitle', {
      defaultMessage: 'This policy contains errors',
    }),
    body: i18n.translate('xpack.indexLifecycleMgmt.policyErrorCalloutDescription', {
      defaultMessage: 'Please fix all errors before saving the policy.',
    }),
  },
};

export const FormErrorsCallout: FunctionComponent = () => {
  const {
    errors: { hasErrors },
  } = useFormErrorsContext();

  if (!hasErrors) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        data-test-subj="policyFormErrorsCallout"
        color="danger"
        title={i18nTexts.callout.title}
      >
        {i18nTexts.callout.body}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
