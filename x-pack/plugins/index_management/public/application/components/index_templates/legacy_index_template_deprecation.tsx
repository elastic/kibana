/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiCallOut } from '@elastic/eui';
import { documentationService } from '../../services/documentation';

export const LegacyIndexTemplatesDeprecation = () => (
  <EuiCallOut
    title={i18n.translate('xpack.idxMgmt.legacyIndexTemplatesDeprecation.title', {
      defaultMessage: 'Legacy index templates are deprecated in favor of composable templates',
    })}
    color="warning"
    iconType="alert"
    data-test-subj="legacyIndexTemplateDeprecationWarning"
  >
    <p>
      <FormattedMessage
        id="xpack.idxMgmt.legacyIndexTemplatesDeprecation.description"
        defaultMessage="Use composable index templates instead. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink
              href={documentationService.getTemplatesDocumentationLink()}
              target="_blank"
              external
            >
              {i18n.translate('xpack.idxMgmt.legacyIndexTemplatesDeprecation.learnMoreLinkText', {
                defaultMessage: 'Learn more.',
              })}
            </EuiLink>
          ),
        }}
      />
    </p>
  </EuiCallOut>
);
