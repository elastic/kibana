/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink } from '@elastic/eui';

interface Props {
  documentationUrl?: string;
}

export const DeprecationFlyoutLearnMoreLink = ({ documentationUrl }: Props) => {
  return (
    <EuiLink target="_blank" data-test-subj="documentationLink" href={documentationUrl}>
      {i18n.translate('xpack.upgradeAssistant.deprecationFlyout.learnMoreLinkLabel', {
        defaultMessage: 'Learn more',
      })}
    </EuiLink>
  );
};
