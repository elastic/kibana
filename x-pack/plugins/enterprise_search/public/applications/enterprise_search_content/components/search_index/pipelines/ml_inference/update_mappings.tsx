/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiPanel,
  EuiBasicTableColumn,
  EuiBasicTable,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FieldMapping } from '../../../../../../../common/ml_inference_pipeline';

import { docLinks } from '../../../../../shared/doc_links';

import { MLInferenceLogic } from './ml_inference_logic';

export const UpdateMappingsInstructions: React.FC = () => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiTitle size="s">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.title',
            {
              defaultMessage: 'Update your index mappings',
            }
          )}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.required',
          {
            defaultMessage: 'Required',
          }
        )}
      >
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.description',
            {
              defaultMessage:
                'You must manually update your index mappings before you can start indexing documents through the pipeline.',
            }
          )}
        </p>
      </EuiCallOut>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiText color="subdued" size="s">
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.presentInMapping',
            {
              defaultMessage:
                'Make sure the selected inference output fields are present in the mapping.',
            }
          )}
        </p>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiLink href={docLinks.mlDocumentEnrichmentUpdateMappings} target="_blank">
        {i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.docsLink',
          {
            defaultMessage: 'Learn more',
          }
        )}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const UpdateMappingsAutomatic: React.FC = () => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiTitle size="s">
        <h4>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.titleNoAction',
            {
              defaultMessage: 'Review index mapping updates',
            }
          )}
        </h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiCallOut>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.descriptionNoAction',
            {
              defaultMessage:
                'Your index mappings will automatically be updated to include the selected inference output fields.',
            }
          )}
        </p>
      </EuiCallOut>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiLink href={docLinks.mlDocumentEnrichmentUpdateMappings} target="_blank">
        {i18n.translate(
          'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.docsLink',
          {
            defaultMessage: 'Learn more',
          }
        )}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const UpdateMappings: React.FC = () => {
  const {
    addInferencePipelineModal: { configuration },
    isTextExpansionModelSelected,
  } = useValues(MLInferenceLogic);

  const areMappingsAutoUpdated = isTextExpansionModelSelected && !configuration.existingPipeline;

  const columns: Array<EuiBasicTableColumn<FieldMapping>> = [
    {
      field: 'targetField',
      name: areMappingsAutoUpdated
        ? i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.fieldMappings',
            {
              defaultMessage: 'Field mappings',
            }
          )
        : i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.addInferencePipelineModal.steps.updateMappings.fieldMappingsRequired',
            {
              defaultMessage: 'Required field mappings',
            }
          ),
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow={3}>
          {areMappingsAutoUpdated ? <UpdateMappingsAutomatic /> : <UpdateMappingsInstructions />}
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <EuiPanel hasBorder>
            <EuiBasicTable
              columns={columns}
              items={configuration.fieldMappings ?? []}
              rowHeader="targetField"
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
