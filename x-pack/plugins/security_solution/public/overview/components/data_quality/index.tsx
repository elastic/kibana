/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';

import { Body } from './data_quality_panel/body';
import { ErrorEmptyPrompt } from './data_quality_panel/error_empty_prompt';
import { LoadingEmptyPrompt } from './data_quality_panel/loading_empty_prompt';
import * as i18n from './translations';
import { useEcsMetadata } from './use_ecs_metadata';
import { useEcsVersion } from './use_ecs_version';

interface Props {
  patterns: string[];
}

const DataQualityPanelComponent: React.FC<Props> = ({ patterns }) => {
  const { ecsMetadata, error: ecsMetadataError, loading: ecsMetadataLoading } = useEcsMetadata();
  const { error: versionError, loading: versionLoading, version } = useEcsVersion();

  const loading = ecsMetadataLoading || versionLoading;
  const error = ecsMetadataError ?? versionError;

  if (!loading && error != null) {
    return (
      <>
        {ecsMetadataError != null && (
          <ErrorEmptyPrompt
            error={ecsMetadataError}
            title={i18n.ERROR_LOADING_ECS_METADATA_TITLE}
          />
        )}
        <EuiSpacer />
        {versionError != null && (
          <ErrorEmptyPrompt error={versionError} title={i18n.ERROR_LOADING_ECS_VERSION_TITLE} />
        )}
      </>
    );
  }

  if (loading) {
    return <LoadingEmptyPrompt loading={i18n.LOADING_ECS_METADATA} />;
  }

  return ecsMetadata != null && version != null ? (
    <Body ecsMetadata={ecsMetadata} patterns={patterns} version={version} />
  ) : null;
};

DataQualityPanelComponent.displayName = 'DataQualityPanelComponent';

export const DataQualityPanel = React.memo(DataQualityPanelComponent);
