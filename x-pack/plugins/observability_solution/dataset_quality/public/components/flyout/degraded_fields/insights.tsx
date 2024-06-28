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

      const doesMatchingDynamicTemplateExists =
        ignoredMetadata.mappings.possibleMatchingDynamicTemplates.length > 0;

      let dynamicTemplateMessage = '';
      const dynamicMappingFlag =
        ignoredMetadata.mappings.isDynamic === undefined || ignoredMetadata.mappings.isDynamic;

      if (doesMatchingDynamicTemplateExists) {
        dynamicTemplateMessage = dedent`
          The field ${field} has a matching dynamic template in the mappings.
          The dynamic templates are ${ignoredMetadata.mappings.possibleMatchingDynamicTemplates}.
        `;
      }

      return (
        getContextualInsightMessages &&
        getContextualInsightMessages({
          message: `Can you identify possible causes and remediation's for ${field} being ignored in the data stream - ${dataStream}?`,
          instructions: dedent(
            `I'm an SRE using Elastic stack. I am looking at a degraded field on ingestion side and I want to understand why it was ignored and what should I do next.

            You are an expert on Elastic Stack, who is being consulted about data set quality with respect to ignored fields in log datasets.

            "Data Set quality" is a concept based on the percentage of degraded documents in each data set.
            A degraded document in a data set contains the _ignored property because one or more of its fields were ignored during indexing.
            Fields are ignored for a variety of reasons -

            1. Data Type Mismatch: If the data type of the field in the document does not match the expected data type defined in the index mapping, Elasticsearch will ignore the field. For example, if a field is expected to be a number but a string is provided, it will be ignored.
            2. Malformed Data: If the data in the field is malformed and cannot be parsed according to the expected data type, it will be ignored. For instance, a date field with an invalid date format will be ignored.
            3. Field Length Exceeds Limit: Elasticsearch has limits on the length of fields, especially for text fields. If the content of a field exceeds these limits, it will be ignored.
            4. Array Field Issues: If a field is expected to be a single value but an array is provided, or if an array contains mixed data types that are not compatible with the field's mapping, the field may be ignored.
            5. Dynamic Mapping Conflicts: When dynamic mapping is enabled, if Elasticsearch encounters fields with conflicting types in different documents, it might ignore the fields that cause the conflict.
            6. Indexing Errors: General indexing errors, such as those caused by resource constraints or configuration issues, can result in fields being ignored.

            The above information is only for you. You can reference them but don't need to tell the user all this.

            Based on the provided contextual information below, help the SRE identify the exact root cause of why the ${field} field on ${dataStream} datastream was ignored and suggest possible remedies.
            Use the following contextual information to eliminate the possible reason so that you can narrow down to exact issue.

            ##Contextual Information

            The contextual Information below is classified into 3 categories: You can display the user the below 3 provided information in a tabular format or in a list format.

            1. Mappings Information:
            This information is retrieved from the GET ${dataStream}/_mapping and GET ${dataStream}/_field_caps API.

            The specific mapping for the field ${field} is ${JSON.stringify(
              ignoredMetadata.mappings.mappings
            )}.
            The total fields count for the dataStream is ${
              ignoredMetadata.mappings.fieldCount
            }, which is coming from fieldsCap API
            The dataStream mapping have a dynamic property set to ${dynamicMappingFlag}

            ${dynamicTemplateMessage}

            2. Settings Information:
            This information is retrieved from the GET ${dataStream}/_settings/ API.

            ignore_dynamic_beyond_limit:${ignoredMetadata.settings.ignoreDynamicBeyondLimit}
            ignore_malformed:${ignoredMetadata.settings.ignoreMalformed}

            The settings API too has the possibility to have mappings inside them. The mappings from the Settings API - ${JSON.stringify(
              ignoredMetadata.settings.mappingInsideIndexSettings
            )}
            The total number of allowed fields is generally set here -  'settings.mappings.total_fields.limit', if you don't see this value inside mappings above, then it is not set and the default value is 1000.

            The following pipeline information is available:
            default_pipeline:${ignoredMetadata.settings.pipelines.defaultPipeline}
            final_pipeline:${ignoredMetadata.settings.pipelines.finalPipeline}

            You can tell the user to check the pipelines for any issues that might be causing the field to be ignored. Only tell if their values are not undefined

            3. Templates Information:
            This information is retrieved from the GET /_index_template/${dataStream} and GET /_component_template/ API.

            The following index template information is available:
            index_template_name:${ignoredMetadata.templates.indexTemplateName}
            does_template_exist:${ignoredMetadata.templates.doesIndexTemplateExists}

            The following component template information is available:
            component_template_name:${ignoredMetadata.templates.customComponentTemplates}
            the settings and mappings present inside the component templates are ${JSON.stringify(
              ignoredMetadata.templates.customComponentTemplatesSettingsAndMappings
            )}

            The remediation must be based on the given context information, avoid generic remedies wherever possible.
            Try to compute remedies based on numbers provided, especially around limits.
            If the total number of fields present is less than the settings.mappings.total_fields.limit, then the remedy is not to increase the field limit, so avoid suggesting it.
            for e.g. if the limit is 1000 and the current field count is 55, then the remedy should not include Increase Fields Limit as the total count is already within the limits
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
