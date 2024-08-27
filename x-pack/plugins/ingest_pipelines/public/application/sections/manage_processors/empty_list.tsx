/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const EmptyList = ({ addDatabaseButton }: { addDatabaseButton: JSX.Element }) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      iconType="database"
      iconColor="default"
      title={
        <h2 data-test-subj="geoipEmptyListPrompt">
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.emptyPromptTitle"
            defaultMessage="Add your first database for GeoIP processor"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.ingestPipelines.manageProcessors.geoip.emptyPromptDescription"
            defaultMessage="Use a custom database when setting up GeoIP processor."
          />
        </p>
      }
      actions={addDatabaseButton}
    />
  );
};
