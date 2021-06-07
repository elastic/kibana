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
    title="Legacy index templates will be deprecated in a future release"
    color="warning"
    iconType="alert"
    data-test-subj="legacyIndexTemplateDeprecationWarning"
  >
    <p>
      <FormattedMessage
        id="xpack.idxMgmt.home.indexTemplatesDescription"
        defaultMessage="Migrate your legacy index templates to composable index templates. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink
              href={documentationService.getTemplatesDocumentationLink()}
              target="_blank"
              external
            >
              {i18n.translate(
                'xpack.idxMgmt.home.legacyIndexTemplatesDeprecation.learnMoreLinkText',
                {
                  defaultMessage: 'Learn more.',
                }
              )}
            </EuiLink>
          ),
        }}
      />
    </p>
  </EuiCallOut>
);
