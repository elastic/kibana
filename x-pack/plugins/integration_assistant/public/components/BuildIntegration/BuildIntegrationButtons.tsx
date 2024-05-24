/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';

import { buildIntegration, installIntegration } from '@api/services/integrationBuilderService';
import RoutePaths from '../../constants/routePaths';
import ActionButton from '../Buttons/ActionButton';
import GoBackButton from '../Buttons/GoBackButton';

export const BuildIntegrationButtons = () => {
  const integrationBuilderZipFile = useGlobalStore((state) => state.integrationBuilderZipFile);
  const packageName = useGlobalStore((state) => state.packageName);
  const packageTitle = useGlobalStore((state) => state.packageTitle);
  const packageVersion = useGlobalStore((state) => state.packageVersion);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const inputTypes = useGlobalStore((state) => state.inputTypes);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const ingestPipeline = useGlobalStore((state) => state.ingestPipeline);
  const docs = useGlobalStore((state) => state.docs);

  const setIntegrationBuilderZipFile = useGlobalStore(
    (state) => state.setIntegrationBuilderZipFile
  );
  const setIntegrationBuilderStepsState = useGlobalStore(
    (state) => state.setIntegrationBuilderStepsState
  );

  const onBuildClick = async () => {
    const req = {
      packageName,
      packageTitle,
      packageVersion,
      dataStreamName,
      inputTypes,
      formSamples,
      ingestPipeline,
      docs,
    };
    const response = await buildIntegration(req);
    if (response) {
      setIntegrationBuilderZipFile(response);
      console.log('Integration built successfully', response.name);
      setIntegrationBuilderStepsState('integrationBuilderStep5', 'complete');
    }
  };

  const onDownloadClick = () => {
    if (integrationBuilderZipFile) {
      const url = window.URL.createObjectURL(integrationBuilderZipFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = integrationBuilderZipFile.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    }
  };

  const onInstallClick = async () => {
    if (integrationBuilderZipFile) {
      installIntegration(integrationBuilderZipFile);
    }
    console.log('installed');
  };

  return (
    <EuiFlexGroup>
      <ActionButton text="Build Integration" onActionClick={onBuildClick} />
      <ActionButton text="Download Integration" onActionClick={onDownloadClick} />
      <ActionButton
        text="Install To Kibana (Not Implemented)"
        onActionClick={onInstallClick}
        isDisabled={true}
      />
      <GoBackButton path={RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH} />
    </EuiFlexGroup>
  );
};
