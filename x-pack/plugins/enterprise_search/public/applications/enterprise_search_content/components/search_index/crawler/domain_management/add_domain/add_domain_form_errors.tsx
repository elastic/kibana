/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain_logic';

export const AddDomainFormErrors: React.FC = () => {
  const { errors } = useValues(AddDomainLogic);

  if (errors.length > 0) {
    return (
      <EuiCallOut
        color="danger"
        iconType="alert"
        title={i18n.translate('xpack.enterpriseSearch.crawler.addDomainForm.errorsTitle', {
          defaultMessage: 'Something went wrong. Please address the errors and try again.',
        })}
      >
        {errors.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </EuiCallOut>
    );
  }

  return null;
};
