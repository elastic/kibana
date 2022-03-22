/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLink, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';

export function NoDataPrompt({
  onCTAClicked,
  documentationLink,
}: {
  onCTAClicked: () => void;
  documentationLink: string;
}) {
  return (
    <EuiPageTemplate
      template="centeredContent"
      pageContentProps={{
        paddingSize: 'none',
        role: null, // For passing a11y tests in EUI docs only
      }}
    >
      <EuiEmptyPrompt
        color="plain"
        hasBorder={true}
        data-test-subj="createFirstRuleEmptyPrompt"
        title={
          <h2>
            <FormattedMessage
              id="xpack.observability.rules.emptyPrompt.emptyTitle"
              defaultMessage="Create your first Rule"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.observability.rules.noDataPrompt.noDataDesc"
              defaultMessage="Rules allow you to receive alerts and automate custom actions when specific conditions are met."
            />
          </p>
        }
        actions={[
          <EuiButton
            iconType="plusInCircle"
            data-test-subj="createFirstRuleButton"
            key="create-action"
            fill
            onClick={onCTAClicked}
          >
            <FormattedMessage
              id="xpack.observability.rules.emptyPrompt.emptyButton"
              defaultMessage="Create Rule"
            />
          </EuiButton>,
          <EuiButtonEmpty color="primary">
            <EuiLink href={documentationLink} target="_blank">
              Documentation
            </EuiLink>
          </EuiButtonEmpty>,
        ]}
      />
    </EuiPageTemplate>
  );
}
