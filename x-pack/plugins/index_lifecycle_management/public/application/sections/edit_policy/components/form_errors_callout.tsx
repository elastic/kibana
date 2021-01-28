/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { useFormContext, useFormData } from '../../../../shared_imports';

import { FormInternal } from '../types';

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
  const [errors, setErrors] = useState<string[]>([]);
  const form = useFormContext<FormInternal>();

  // Hook into form data updates
  useFormData<FormInternal>();

  useEffect(() => {
    setTimeout(() => {
      setErrors(form.getErrors());
    });
  });

  if (errors.length < 1) {
    return null;
  }

  return (
    <>
      <EuiCallOut color="danger" title={i18nTexts.callout.title}>
        {i18nTexts.callout.body}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
