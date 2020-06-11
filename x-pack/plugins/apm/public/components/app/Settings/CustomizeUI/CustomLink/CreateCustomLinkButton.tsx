/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const CreateCustomLinkButton = ({
  onClick,
}: {
  onClick: () => void;
}) => (
  <EuiButton color="primary" fill onClick={onClick}>
    {i18n.translate(
      'xpack.apm.settings.customizeUI.customLink.createCustomLink',
      { defaultMessage: 'Create custom link' }
    )}
  </EuiButton>
);
