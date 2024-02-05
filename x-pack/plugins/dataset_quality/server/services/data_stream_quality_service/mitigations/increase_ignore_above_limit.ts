/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterComponentTemplate, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { merge } from 'lodash';
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
          data_streams: [dataStreamInfo],
        } = await elasticsearchClient.asCurrentUser.indices.getDataStream({
          name: args.data_stream,
          expand_wildcards: 'none',
        });
        const indexTemplateName = dataStreamInfo.template;

        // derive @custom mapping component template
        const componentTemplateName = `${indexTemplateName}@custom`;
        const updatedFieldMapping: MappingTypeMapping = {
          properties: {
            [args.field]: {
              ignore_above: args.limit,
            },
          },
        };

        // update mapping in component template
        const {
          component_templates: [previousComponentTemplate],
        } = await elasticsearchClient.asCurrentUser.cluster.getComponentTemplate({
          name: componentTemplateName,
        });
        const nextComponentTemplate: ClusterComponentTemplate = merge(previousComponentTemplate, {
          component_template: {
            template: {
              mappings: updatedFieldMapping,
            },
          },
        });
        await elasticsearchClient.asCurrentUser.cluster.putComponentTemplate(nextComponentTemplate);

        // update mapping in write index
        await elasticsearchClient.asCurrentUser.indices.putMapping({
          index: args.data_stream,
          ...updatedFieldMapping,
        });

        return;
      },
  };
