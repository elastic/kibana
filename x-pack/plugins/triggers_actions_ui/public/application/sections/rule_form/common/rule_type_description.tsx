/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleTypeModel, useKibana } from '../../../..';

export const RuleTypeDescription = ({ ruleTypeModel }: { ruleTypeModel: RuleTypeModel | null }) => {
  const { docLinks } = useKibana().services;

  return ruleTypeModel?.description ? (
    <EuiText color="subdued" size="s" data-test-subj="ruleDescription">
      {ruleTypeModel.description}&nbsp;
      {ruleTypeModel?.documentationUrl && (
        <EuiLink
          external
          target="_blank"
          data-test-subj="ruleDocumentationLink"
          href={
            typeof ruleTypeModel.documentationUrl === 'function'
              ? ruleTypeModel.documentationUrl(docLinks)
              : ruleTypeModel.documentationUrl
          }
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.ruleForm.documentationLabel"
            defaultMessage="Learn more"
          />
        </EuiLink>
      )}
    </EuiText>
  ) : null;
};
