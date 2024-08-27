/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

export const DetailsPageLoading: React.FC = () => {
  return (
    <SectionLoading>
      <FormattedMessage
        id="xpack.idxMgmt.indexDetails.loadingDescription"
        defaultMessage="Loading index details…"
      />
    </SectionLoading>
  );
};
