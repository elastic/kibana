/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiPanel, EuiSpacer, EuiText, EuiCopy, EuiButtonEmpty } from '@elastic/eui';
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
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const componentTemplateUrl = locators.get('MANAGEMENT_APP_LOCATOR')?.useUrl(
    isIntegration
      ? {
          componentTemplate: `${getComponentTemplatePrefixFromIndexTemplate(
            dataStreamSettings?.indexTemplate ?? name
          )}@custom`,
        }
      : { indexTemplate: dataStreamSettings?.indexTemplate }
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsCustomComponentTemplateLink"
        href={componentTemplateUrl}
        css={{ width: '100%' }}
        target="_blank"
        external
      >
        {otherMitigationsCustomComponentTemplate}
      </EuiLink>
    </EuiPanel>
  );
}

function EditPipeline({ isIntegration }: { isIntegration: boolean }) {
  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const { datasetDetails } = useDatasetQualityDetailsState();
  const { type, name } = datasetDetails;

  const copyText = isIntegration ? `${type}-${name}@custom` : `${type}@custom`;

  const pipelineUrl = locators.get('MANAGEMENT_APP_LOCATOR')?.useUrl({ pipeline: '' });

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsPipelineLink"
        href={pipelineUrl}
        target="_blank"
        external
        css={{ width: '100%' }}
      >
        {otherMitigationsCustomIngestPipeline}
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
