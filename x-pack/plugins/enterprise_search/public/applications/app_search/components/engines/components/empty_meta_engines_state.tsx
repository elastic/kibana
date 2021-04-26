/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_PREFIX } from '../../../routes';

export const EmptyMetaEnginesState: React.FC = () => (
  <EuiEmptyPrompt
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engines.metaEngines.emptyPromptTitle', {
          defaultMessage: 'Create your first meta engine',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engines.metaEngines.emptyPromptDescription',
          {
            defaultMessage:
              'Meta engines allow you to combine multiple engines into one searchable engine.',
          }
        )}
      </p>
    }
    actions={
      <EuiButton
        size="s"
        target="_blank"
        iconType="popout"
        href={`${DOCS_PREFIX}/meta-engines-guide.html`}
      >
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engines.metaEngines.emptyPromptButtonLabel',
          { defaultMessage: 'Learn more about meta engines' }
        )}
      </EuiButton>
    }
  />
);
