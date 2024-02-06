/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterComponentTemplateNode,
  MappingPropertyBase,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';
import { IncreaseIgnoreAboveMitigation } from '../../../../common';
import { GenericMitigationImplementation } from './types';

export type IgnoreAboveMitigationArguments = Omit<IncreaseIgnoreAboveMitigation, 'id'>;

export const increaseIgnoreAboveMitigation: GenericMitigationImplementation<IgnoreAboveMitigationArguments> =
  {
    id: 'mapping-increase-ignore-above',
    apply:
      ({ elasticsearchClient }) =>
      async (args) => {
        // get index template
        const {
          data_streams: [{ template: indexTemplateName }],
        } = await elasticsearchClient.asCurrentUser.indices.getDataStream({
          name: args.data_stream,
          expand_wildcards: 'none',
        });

        // derive @custom mapping component template
        const componentTemplateName = `${indexTemplateName}@custom`;
        const updateFieldMapping = (previousProperty: MappingPropertyBase) => ({
          ...previousProperty,
          ignore_above: args.limit,
        });
        const updateMappingProperties = (
          previousMapping: MappingTypeMapping
        ): MappingTypeMapping => ({
          ...previousMapping,
          properties: {
            ...previousMapping.properties,
            [args.field]: updateFieldMapping(previousMapping.properties?.[args.field] ?? {}),
          },
        });
        // TODO: make it work with dotted fields (see functions at the end of this file)

        // TODO: get mapping for field from data stream
        const fieldMappings = await elasticsearchClient.asCurrentUser.indices.getFieldMapping({
          fields: args.field,
        });
        const latestFieldMapping = Object.entries(fieldMappings)
          .sort(([firstIndexName, firstFieldMapping], [secondIndexName, secondFieldMapping]) =>
            firstIndexName < secondIndexName ? -1 : firstIndexName > secondIndexName ? 1 : 0
          )
          .at(-1)?.[1]?.mappings?.[args.field]?.mapping?.[args.field];

        // update mapping in component template
        const {
          component_templates: [{ component_template: previousComponentTemplate }],
        } = await elasticsearchClient.asCurrentUser.cluster.getComponentTemplate({
          name: componentTemplateName,
        });
        const nextComponentTemplate: ClusterComponentTemplateNode = {
          ...previousComponentTemplate,
          template: {
            ...previousComponentTemplate.template,
            mappings: updateMappingProperties(previousComponentTemplate.template.mappings ?? {}),
          },
        };
        await elasticsearchClient.asCurrentUser.cluster.putComponentTemplate({
          name: componentTemplateName,
          ...nextComponentTemplate,
        });

        // roll over data stream
        await elasticsearchClient.asCurrentUser.indices.rollover({
          alias: args.data_stream,
        });

        return {
          type: 'applied',
        };
      },
  };

const getMappingAt =
  ([head, ...tail]: string[]) =>
  (mappingProperty: MappingPropertyBase): MappingPropertyBase | undefined => {
    if (head == null) {
      return mappingProperty;
    } else {
      const childMappingProperty = mappingProperty.properties?.[head];
      if (childMappingProperty != null) {
        return getMappingAt(tail)(childMappingProperty);
      } else {
        return undefined;
      }
    }
  };

const updateMappingAt =
  (
    [head, ...tail]: string[],
    updater: (mappingProperty: MappingPropertyBase) => MappingPropertyBase
  ) =>
  (mappingProperty: MappingPropertyBase): MappingPropertyBase => {
    if (head == null) {
      return updater(mappingProperty);
    } else {
      const childMappingProperty = mappingProperty.properties?.[head] ?? {};

      return {
        ...mappingProperty,
        properties: {
          ...mappingProperty.properties,
          [head]: updateMappingAt(tail, updater)(childMappingProperty),
        },
      };
    }
  };
