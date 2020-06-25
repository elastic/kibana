/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import { useComponentTemplatesContext } from '../component_templates_context';

export const EmptyPrompt: FunctionComponent = () => {
  const { documentation } = useComponentTemplatesContext();

  return (
    <EuiEmptyPrompt
      iconType="managementApp"
      data-test-subj="emptyList"
      title={
        <h2 data-test-subj="title">
          {i18n.translate('xpack.idxMgmt.home.componentTemplates.emptyPromptTitle', {
            defaultMessage: 'Start by creating a component template',
          })}
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.home.componentTemplates.emptyPromptDescription"
            defaultMessage="For example, you might create a component template that defines index settings that can be reused across index templates."
          />
          <br />
          <EuiLink href={documentation.componentTemplates} target="_blank" external>
            {i18n.translate('xpack.idxMgmt.home.componentTemplates.emptyPromptDocumentionLink', {
              defaultMessage: 'Learn more',
            })}
          </EuiLink>
        </p>
      }
    />
  );
};
