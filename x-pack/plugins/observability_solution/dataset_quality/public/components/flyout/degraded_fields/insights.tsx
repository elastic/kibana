/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import dedent from 'dedent';
import React, { useCallback } from 'react';
import { DegradedFieldMetadataResponse } from '../../../../common/data_streams_stats';
import { useKibanaContextForPlugin } from '../../../utils';

const ignoredAnalysisTitle = i18n.translate(
  'xpack.datasetQuality.flyout.degradedFields.ignoredAnalysis',
  {
    defaultMessage: 'Possible causes and remediations',
  }
);

export function Insights({ dataStream, field }: { dataStream: string; field: string }) {
  const {
    services: {
      observabilityAIAssistant: {
        ObservabilityAIAssistantContextualInsight,
        getContextualInsightMessages,
      } = {},
      http,
    },
  } = useKibanaContextForPlugin();

  const getDegradedFieldContextMessages = useCallback(async () => {
    if (!ObservabilityAIAssistantContextualInsight) {
      return [];
    }

    try {
      const { ignoredMetadata } = await http.get<DegradedFieldMetadataResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/ignored_metadata/${field}`
      );

      return (
        getContextualInsightMessages &&
        getContextualInsightMessages({
          message: `Can you identify possible causes and remediations for ${field} being ignored when ingesting documents in ${dataStream} datastream?`,
          instructions: dedent(
            `I'm an administrator using Elastic stack. I am looking at a degraded field on ingestion side and I want to understand why it was ignored and what should I do next.

            You are an expert using Elastic Stack on call being consulted about data set quality and incorrect ingested documents in log datasets. Your job is to take immediate action and proceed with both urgency and precision.
            "Data Set quality" is a concept based on the percentage of degraded documents in each data set. A degraded document in a data set contains the _ignored property because one or more of its fields were ignored during indexing. Fields are ignored for a variety of reasons. For example, when the ignore_malformed parameter is set to true, if a document field contains the wrong data type, the malformed field is ignored and the rest of the document is indexed.
            You are using "Data set quality" and got the degradedDocs percentage on ${dataStream} dataset. Determine what was the cause for ${field} field getting ignored.

            The following contextual information is available to help you understand the surroundings of field ${field}:
            the mapping for the field ${field} is ${ignoredMetadata.mappings.mappings}.
            the total fields count for the dataStream is ${ignoredMetadata.mappings.fieldCount}, which is coming from fieldsCap API
            the dataStream mapping have a dynamic property set to ${ignoredMetadata.mappings.isDynamic}
            
            The bellow information is retrieved from the dataStream settings API:
            ignore_dynamic_beyond_limit:${ignoredMetadata.settings.ignoreDynamicBeyondLimit}
            ignore_malformed:${ignoredMetadata.settings.ignoreMalformed}

            The mappings inside the settings API response is ${ignoredMetadata.settings.mappingInsideIndexSettings}
            The total number of allowed fields in present inside settings.mappings.total_fields.limit, if you don't see this value then it is not set and the default value is 1000.

            The following pipelines available are ${ignoredMetadata.settings.pipelines}

            The following index template information is available:
            index_template_name:${ignoredMetadata.templates.indexTemplateName}
            does_template_exist:${ignoredMetadata.templates.doesIndexTemplateExists}

            The following component template information is available:
            component_template_name:${ignoredMetadata.templates.customComponentTemplates}
            the settings and mappings present inside the component templates are ${ignoredMetadata.templates.customComponentTemplatesSettingsAndMappings}
            
            The remediation must be based on the given context information, avoid generic remedies wherever possible.
            Try to compute remedies based on numbers provided, especially around limits.
            If the total number of fields present is less than the settings.mappings.total_fields.limit, then the remedy is not to increase the field limit, so avoid suggesting it.
            for e.g. if the limit is 1000 and the current field count is 55, then the remedy should not include Increase Fields Limit.
          `
          ),
        })
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('An error occurred while fetching degradedField context', e);
      return (
        getContextualInsightMessages &&
        getContextualInsightMessages({
          message: `Can you identify possible causes and remediations for ${field} being ignored when ingesting documents in ${dataStream} datastream?`,
          instructions: dedent(
            `I'm an administrator using Elastic stack. I am looking at a degraded field on ingestion side and I want to understand why it was ignored and what should I do next`
          ),
        })
      );
    }
  }, [
    ObservabilityAIAssistantContextualInsight,
    dataStream,
    field,
    getContextualInsightMessages,
    http,
  ]);

  return ObservabilityAIAssistantContextualInsight ? (
    <ObservabilityAIAssistantContextualInsight
      title={ignoredAnalysisTitle}
      messages={getDegradedFieldContextMessages}
      openedByDefault={true}
    />
  ) : (
    <></>
  );
}
