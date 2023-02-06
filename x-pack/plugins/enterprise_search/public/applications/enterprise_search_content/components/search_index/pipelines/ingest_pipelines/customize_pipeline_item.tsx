/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButtonEmpty, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';
import { LicensingLogic } from '../../../../../shared/licensing';
import { CreateCustomPipelineApiLogic } from '../../../../api/index/create_custom_pipeline_api_logic';

import { IndexViewLogic } from '../../index_view_logic';

export const CustomizeIngestPipelineItem: React.FC = () => {
  const { indexName, ingestionMethod } = useValues(IndexViewLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { makeRequest: createCustomPipeline } = useActions(CreateCustomPipelineApiLogic);
  const isGated = !isCloud && !hasPlatinumLicense;

  return (
    <>
      {isGated ? (
        <EuiText color="subdued" size="s" grow={false}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.copyAndCustomize.platinumText',
            {
              defaultMessage:
                'With a platinum license, you can create an index-specific version of this configuration and modify it for your use case.',
            }
          )}
        </EuiText>
      ) : (
        <EuiText color="subdued" size="s" grow={false}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.copyAndCustomize.description',
            {
              defaultMessage:
                'You can create an index-specific version of this configuration and modify it for your use case.',
            }
          )}
        </EuiText>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiButtonEmpty
          data-telemetry-id={`entSearchContent-${ingestionMethod}-pipelines-ingestPipelines-copyAndCustomize`}
          disabled={isGated}
          iconType={isGated ? 'lock' : undefined}
          onClick={() => createCustomPipeline({ indexName })}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.content.index.pipelines.ingestModal.copyButtonLabel',
            { defaultMessage: 'Copy and customize' }
          )}
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
};
