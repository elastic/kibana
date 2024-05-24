/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import DocResults from '../../components/IntegrationResults/DocsResults';
import PipelineResults from '../../components/IntegrationResults/PipelineResults';
import EmptyPrompt from '../../components/EmptyPrompt/EmptyPrompt';
import FinalResultsButtons from '../../components/ViewResults/ViewResultsButtons';
import RoutePaths from '../../constants/routePaths';

export const ViewResultsPage = () => {
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const docs = useGlobalStore((state) => state.docs);

  if (Object.keys(ingestPipeline).length <= 0) {
    return (
      <EmptyPrompt
        title={'Ingest Pipeline is missing'}
        description={'No existing Ingest Pipeline was found. Go back to the ECS Mapping step.'}
        goBackPath={RoutePaths.CATEGORIZATION_PATH}
      />
    );
  }
  return (
    <EuiPageTemplate.Section grow={false}>
      <DocResults docs={docs} />
      <EuiSpacer />
      <PipelineResults pipeline={ingestPipeline} />
      <EuiSpacer />
      <FinalResultsButtons />
    </EuiPageTemplate.Section>
  );
};
