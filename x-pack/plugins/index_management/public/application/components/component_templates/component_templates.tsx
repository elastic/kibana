/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import { ComponentTemplateSerialized } from '../../../../common';
import { CreateButtonPopOver } from './components';

interface Props {
  isLoading: boolean;
  components: ComponentTemplateSerialized[];
}

export const ComponentTemplates = ({ isLoading, components }: Props) => {
  const renderEmptyPrompt = () => {
    const emptyPromptBody = (
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpackidxMgmt.componentTemplatesFlyout.subhead"
            defaultMessage="Save your settings, mappings and aliases in components so you can reuse them in any of your index templates."
          />
          <br />
          <EuiLink href="https://elastic.co" target="_blank">
            <FormattedMessage
              id="xpackidxMgmt.componentTemplatesFlyout.emptyPromptLearnMoreLinkText"
              defaultMessage="Learn more."
            />
          </EuiLink>
        </p>
      </EuiText>
    );
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h2 style={{ fontSize: '1.5rem' }}>
            <FormattedMessage
              id="xpackidxMgmt.componentTemplatesFlyout.emptyPromptTitle"
              defaultMessage="You don’t have any components yet"
            />
          </h2>
        }
        body={emptyPromptBody}
        actions={<CreateButtonPopOver anchorPosition="downCenter" />}
        data-test-subj="emptyPrompt"
      />
    );
  };

  if (isLoading) {
    return <p>Loading....</p>;
  }

  if (components.length === 0) {
    return renderEmptyPrompt();
  }

  return (
    <>
      <h1>Components</h1>
      <p>Here will come the list</p>
    </>
  );
};
