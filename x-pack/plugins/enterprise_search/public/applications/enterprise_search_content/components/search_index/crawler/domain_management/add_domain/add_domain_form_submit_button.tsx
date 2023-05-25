/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain_logic';

export const AddDomainFormSubmitButton: React.FC = () => {
  const { submitNewDomain } = useActions(AddDomainLogic);

  const { allowSubmit } = useValues(AddDomainLogic);

  return (
    <EuiButton
      fill
      type="button"
      disabled={!allowSubmit}
      onClick={submitNewDomain}
      data-test-subj="entSearchContent-crawler-addDomain-submitButton"
    >
      {i18n.translate('xpack.enterpriseSearch.crawler.addDomainForm.submitButtonLabel', {
        defaultMessage: 'Add domain',
      })}
    </EuiButton>
  );
};
