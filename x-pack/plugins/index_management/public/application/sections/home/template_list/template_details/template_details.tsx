/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';

import { TemplateDetailsContent, Props } from './template_details_content';

export const TemplateDetails = (props: Props) => {
  return (
    <EuiFlyout
      onClose={props.onClose}
      data-test-subj="templateDetails"
      aria-labelledby="templateDetailsFlyoutTitle"
      size="m"
      maxWidth={500}
    >
      <TemplateDetailsContent {...props} />
    </EuiFlyout>
  );
};
