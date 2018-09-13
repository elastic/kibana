/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

export const TabTermsUi = ({ terms }) => {
  // TODO: Render a table if there are more than 20 fields.
  const renderedTerms = terms.map(({ name }) => {
    return (
      <li key={name}>
        {name}
      </li>
    );
  });

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.rollupJobs.jobDetails.tabTerms.sectionTerms.title"
            defaultMessage="Terms"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText>
        <ul>
          {renderedTerms}
        </ul>
      </EuiText>
    </Fragment>
  );
};

export const TabTerms = injectI18n(TabTermsUi);
