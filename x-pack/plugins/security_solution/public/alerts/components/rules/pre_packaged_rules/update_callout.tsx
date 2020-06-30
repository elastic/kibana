/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';

import { EuiCallOut, EuiButton, EuiLink } from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

interface UpdatePrePackagedRulesCallOutProps {
  loading: boolean;
  numberOfUpdatedRules: number;
  numberOfUpdatedTimelines: number;
  updateRules: () => void;
}

const UpdatePrePackagedRulesCallOutComponent: React.FC<UpdatePrePackagedRulesCallOutProps> = ({
  loading,
  numberOfUpdatedRules,
  numberOfUpdatedTimelines,
  updateRules,
}) => {
  const { services } = useKibana();
  return (
    <EuiCallOut title={i18n.UPDATE_PREPACKAGED_RULES_TITLE}>
      <p>
        {i18n.UPDATE_PREPACKAGED_RULES_MSG(numberOfUpdatedRules, numberOfUpdatedTimelines)}
        <br />
        <EuiLink
          href={`${services.docLinks.ELASTIC_WEBSITE_URL}guide/en/siem/guide/${services.docLinks.DOC_LINK_VERSION}/prebuilt-rules-changelog.html`}
          target="_blank"
        >
          {i18n.RELEASE_NOTES_HELP}
        </EuiLink>
      </p>
      <EuiButton onClick={updateRules} size="s" isLoading={loading}>
        {i18n.UPDATE_PREPACKAGED_RULES(numberOfUpdatedRules, numberOfUpdatedTimelines)}
      </EuiButton>
    </EuiCallOut>
  );
};

export const UpdatePrePackagedRulesCallOut = memo(UpdatePrePackagedRulesCallOutComponent);
