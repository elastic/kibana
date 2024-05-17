/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { HelpMenu } from '../../../components/help_menu';
import { MlPageHeader } from '../../../components/page_header';
import { useMlKibana } from '../../../contexts/kibana';
import { SourceSelection } from '../analytics_management/components/source_selection';

export const Page: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.dataFrameAnalytics;

  return (
    <>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.dataframe.analyticsSourceSelection.title"
          defaultMessage="New analytics job / Choose a source data view"
        />
      </MlPageHeader>

      <SourceSelection />
      <HelpMenu docLink={helpLink} />
    </>
  );
};
