/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation, Send } from '@langchain/langgraph';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { getFieldTypeByPath, getFieldsTopValues } from '@kbn/wc-integration-utils';
import type {
  IndexSourceDefinition,
  IndexSourceFilter,
  IndexSourceQueryFields,
} from '@kbn/wci-common';
import {
  getIndexInformation,
  getSampleDocuments,
  getLeafFields,
  type IndexInformation,
  type SampleDocument,
} from '../utils';
import {
  generateDescriptionPrompt,
  pickFilterFieldsPrompt,
  pickQueryFieldsPrompt,
  pickContentFieldsPrompt,
  generateFilterPrompt,
} from './prompts';

export const createSchemaGraph = async ({
  chatModel,
  esClient,
}: {
  chatModel: InferenceChatModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  const StateAnnotation = Annotation.Root({
    indexName: Annotation<string>(),
    indexInfo: Annotation<IndexInformation>,
    sampleDocuments: Annotation<SampleDocument[]>,
    fieldTopValues: Annotation<Record<string, string[]>>,
    // temporary
    filterFields: Annotation<string[]>,
    queryFields: Annotation<string[]>,
    contentFields: Annotation<string[]>,
    description: Annotation<string>(),
    // output
    generatedDefinition: Annotation<Partial<IndexSourceDefinition>>({
      reducer: (a, b) => ({
        ...a,
        ...b,
        filterFields: [...(a.filterFields ?? []), ...(b.filterFields ?? [])],
      }),
      default: () => ({}),
    }),
  });

  type StateType = typeof StateAnnotation.State;
  type BuildFilterStateType = StateType & {
    fieldName: string;
  };

  const gatherIndexInfo = async (state: StateType) => {
    const indexInfo = await getIndexInformation({
      indexName: state.indexName,
      esClient,
    });
    const sampleDocuments = await getSampleDocuments({
      indexName: state.indexName,
      esClient,
      maxSamples: 3,
    });

    const leafFields = getLeafFields({ mappings: indexInfo.mappings });

    const fieldTopValues = await getFieldsTopValues({
      indexName: state.indexName,
      esClient,
      maxSize: 20,
      fieldNames: leafFields.filter((field) => field.type === 'keyword').map((field) => field.path),
    });

    return {
      indexInfo,
      sampleDocuments,
      fieldTopValues,
      generatedDefinition: { index: state.indexName },
    };
  };

  const pickFilterFields = async (state: StateType) => {
    const structuredModel = chatModel.withStructuredOutput(
      z.object({
        fields: z.array(z.string()).describe('The list of fields to use as filter fields'),
      })
    );

    const response = await structuredModel.invoke(
      pickFilterFieldsPrompt({
        indexName: state.indexName,
        indexInfo: state.indexInfo,
        fieldTopValues: state.fieldTopValues,
        sampleDocuments: state.sampleDocuments,
      })
    );

    return { filterFields: response.fields };
  };

  const dispatchFilterFields = async (state: StateType) => {
    return state.filterFields.map((filterField) => {
      return new Send('build_filter_field', { ...state, fieldName: filterField });
    });
  };

  const buildFilterField = async (state: BuildFilterStateType) => {
    const structuredModel = chatModel.withStructuredOutput(
      z.object({
        description: z
          .string()
          .describe('the description for the filter. Please refer to the instruction'),
        asEnum: z
          .boolean()
          .describe('The asEnum value for the filter. Please refer to the instructions'),
      })
    );

    const fieldName = state.fieldName;
    const fieldType = getFieldTypeByPath({
      fieldPath: state.fieldName,
      mappings: state.indexInfo.mappings,
    });
    const fieldTopValues = state.fieldTopValues[fieldName];

    const response = await structuredModel.invoke(
      generateFilterPrompt({
        indexName: state.indexName,
        fieldName,
        fieldType,
        fieldTopValues,
        sampleDocuments: state.sampleDocuments,
      })
    );

    const filterField: IndexSourceFilter = {
      field: fieldName,
      type: fieldType,
      description: response.description ?? '',
      asEnum: response.asEnum ?? false,
    };

    return {
      generatedDefinition: {
        filterFields: [filterField],
      },
    };
  };

  const pickQueryFields = async (state: StateType) => {
    const structuredModel = chatModel.withStructuredOutput(
      z.object({
        fields: z.array(z.string()).describe('The list of fields to use as fulltext fields'),
      })
    );

    const response = await structuredModel.invoke(
      pickQueryFieldsPrompt({
        indexName: state.indexName,
        indexInfo: state.indexInfo,
        sampleDocuments: state.sampleDocuments,
      })
    );

    return { queryFields: response.fields };
  };

  const buildQueryFields = async (state: StateType) => {
    const {
      indexInfo: { mappings },
    } = state;

    const queryFields: IndexSourceQueryFields[] = state.queryFields.map((field) => {
      return {
        field,
        type: getFieldTypeByPath({ fieldPath: field, mappings })!,
      };
    });

    return {
      generatedDefinition: {
        queryFields,
      },
    };
  };

  ///////
  const pickContentFields = async (state: StateType) => {
    const structuredModel = chatModel.withStructuredOutput(
      z.object({
        fields: z.array(z.string()).describe('The list of fields to use as content fields'),
      })
    );

    const response = await structuredModel.invoke(
      pickContentFieldsPrompt({
        indexName: state.indexName,
        indexInfo: state.indexInfo,
        sampleDocuments: state.sampleDocuments,
      })
    );

    return { contentFields: response.fields };
  };

  const buildContentFields = async (state: StateType) => {
    const {
      indexInfo: { mappings },
    } = state;

    const contentFields: IndexSourceQueryFields[] = state.contentFields.map((field) => {
      return {
        field,
        type: getFieldTypeByPath({ fieldPath: field, mappings })!,
      };
    });

    return {
      generatedDefinition: {
        contentFields,
      },
    };
  };
  ///////

  const generateDescription = async (state: StateType) => {
    const structuredModel = chatModel.withStructuredOutput(
      z.object({
        description: z.string().describe('The description for the tool'),
      })
    );

    const response = await structuredModel.invoke(
      generateDescriptionPrompt({
        sourceDefinition: state.generatedDefinition,
        indexName: state.indexName,
        indexInfo: state.indexInfo,
        sampleDocuments: state.sampleDocuments,
      })
    );
    return { generatedDefinition: { description: response.description } };
  };

  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode('gather_index_info', gatherIndexInfo)
    .addNode('pick_filter_fields', pickFilterFields)
    .addNode('pick_query_fields', pickQueryFields)
    .addNode('build_query_fields', buildQueryFields)
    .addNode('build_filter_field', buildFilterField)
    .addNode('generate_description', generateDescription)
    .addNode('pick_content_fields', pickContentFields)
    .addNode('build_content_fields', buildContentFields)

    // transitions
    .addEdge('__start__', 'gather_index_info')
    .addEdge('gather_index_info', 'pick_filter_fields')
    .addEdge('gather_index_info', 'pick_query_fields')
    .addEdge('gather_index_info', 'pick_content_fields')
    .addEdge('pick_query_fields', 'build_query_fields')
    .addEdge('build_query_fields', 'generate_description')
    .addEdge('pick_content_fields', 'build_content_fields')
    .addEdge('build_content_fields', 'generate_description')
    .addEdge('generate_description', '__end__')
    .addConditionalEdges('pick_filter_fields', dispatchFilterFields, {
      build_filter_field: 'build_filter_field',
    })
    .addEdge('build_filter_field', 'generate_description')
    // done
    .compile();

  return graph;
};
