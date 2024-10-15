/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiCopy,
  EuiButtonEmpty,
} from '@elastic/eui';
import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';
import { useKibanaContextForPlugin } from '../../../../../utils';
import {
  manualMitigationCustomPipelineText,
  otherMitigationsCustomComponentTemplate,
  otherMitigationsCustomIngestPipeline,
} from '../../../../../../common/translations';
import { useDatasetQualityDetailsState } from '../../../../../hooks';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../../../common/utils/component_template_name';

export function ManualMitigations() {
  const { integrationDetails } = useDatasetQualityDetailsState();
  const isIntegration = !!integrationDetails?.integration;
  return (
    <>
      <EditComponentTemplate isIntegration={isIntegration} />
      <EuiSpacer size="s" />
      <EditPipeline isIntegration={isIntegration} />
    </>
  );
}

function EditComponentTemplate({ isIntegration }: { isIntegration: boolean }) {
  const {
    services: { application },
  } = useKibanaContextForPlugin();

  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const onClickHandler = useCallback(async () => {
    await application.navigateToApp(MANAGEMENT_APP_ID, {
      path: isIntegration
        ? `/data/index_management/component_templates/${getComponentTemplatePrefixFromIndexTemplate(
            dataStreamSettings?.indexTemplate ?? name
          )}@custom`
        : `/data/index_management/templates/${dataStreamSettings?.indexTemplate}`,
      openInNewTab: true,
    });
  }, [application, dataStreamSettings?.indexTemplate, isIntegration, name]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsCustomComponentTemplateLink"
        onClick={onClickHandler}
        target="_blank"
        css={{ width: '100%' }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon type="popout" />
          <EuiTitle size="xxs">
            <p>{otherMitigationsCustomComponentTemplate}</p>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiLink>
    </EuiPanel>
  );
}

function EditPipeline({ isIntegration }: { isIntegration: boolean }) {
  const {
    services: { application },
  } = useKibanaContextForPlugin();
  const { datasetDetails } = useDatasetQualityDetailsState();
  const { type, name } = datasetDetails;

  const copyText = isIntegration ? `${type}-${name}@custom` : `${type}@custom`;

  const onClickHandler = async () => {
    await application.navigateToApp(MANAGEMENT_APP_ID, {
      path: '/ingest/ingest_pipelines/?pipeline',
      openInNewTab: true,
    });
  };

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsPipelineLink"
        onClick={onClickHandler}
        target="_blank"
        css={{ width: '100%' }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon type="popout" />
          <EuiTitle size="xxs">
            <p>{otherMitigationsCustomIngestPipeline}</p>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiLink>
      <EuiSpacer size="s" />
      <EuiText data-test-subj="datasetQualityManualMitigationsPipelineLinkText" size="xs">
        <p>{manualMitigationCustomPipelineText}</p>
        <EuiCopy textToCopy={copyText}>
          {(copy) => (
            <EuiButtonEmpty
              iconType="copy"
              onClick={copy}
              data-test-subj="datasetQualityEditPipelineButton"
              size="s"
            >
              {copyText}
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </EuiText>
    </EuiPanel>
  );
}
