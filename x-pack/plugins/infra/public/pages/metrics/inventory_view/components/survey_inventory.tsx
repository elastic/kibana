/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';

const INVENTORY_FEEDBACK_LINK = 'https://ela.st/survey-infra-inventory?usp=pp_url';
const KIBANA_VERSION_QUERY_PARAM = 'entry.548460210';

const getHostFeedbackURL = (kibanaVersion?: string) => {
  const url = new URL(INVENTORY_FEEDBACK_LINK);
  if (kibanaVersion) {
    url.searchParams.append(KIBANA_VERSION_QUERY_PARAM, kibanaVersion);
  }

  return url.href;
};

export const SurveyInventory = () => {
  const {
    services: { kibanaVersion },
  } = useKibanaContextForPlugin();
  return (
    <EuiButton
      href={getHostFeedbackURL(kibanaVersion)}
      target="_blank"
      color="warning"
      iconType="editorComment"
      data-test-subj="infra-inventory-feedback-link"
    >
      <FormattedMessage
        id="xpack.infra.homePage.tellUsWhatYouThinkLink"
        defaultMessage="Tell us what you think!"
      />
    </EuiButton>
  );
};
