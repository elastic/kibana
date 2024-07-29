/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestProcessorContainer,
  MappingProperty,
  MappingPropertyBase,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import { createRenameProcessor } from '../../../../common/pipeline_utils';
import { createMappingGapsDetection } from '../../../../common/detections/utils';
import { NewestIndex } from '../../../../common/types';
import { MappingGap, MappingGapsDetection } from '../../../../common/detections/types';

const ecsAlikeMappings = {
  '@timestamp': ['timestamp', 'time', 'created_at', 'datetime', 'date'],
  message: ['msg', 'description', 'event_message'],
  'log.level': ['log_level', 'severity', 'level'],
};

const ecsAlikeMappingsKeys = Object.keys(ecsAlikeMappings) as Array<keyof typeof ecsAlikeMappings>;

export class MappingGapsDetectionRule {
  constructor(private fieldsMetadataClient: IFieldsMetadataClient) {}

  async process(index: NewestIndex): Promise<MappingGapsDetection | null> {
    try {
      const mappings = index.mappings?.properties;
      const { integration, dataset } = index.info;

      if (!mappings) {
        return null;
      }

      const flattenedMappings = flatMappings(mappings);
      const mappingsKeys = Object.keys(flattenedMappings);

      const fieldsMetadataIntegrationParams = integration ? { integration, dataset } : {};
      const fieldsMetadata = await this.fieldsMetadataClient
        .find({ fieldNames: mappingsKeys, ...fieldsMetadataIntegrationParams })
        .then((fields) => fields.pick(['type']));

      const unmatchingFields = mappingsKeys.filter(
        (fieldMapping) =>
          !fieldsMetadata[fieldMapping] ||
          fieldsMetadata[fieldMapping].type !== flattenedMappings[fieldMapping].type
      );

      if (unmatchingFields.length > 0) {
        const gaps = unmatchingFields
          .map((field) => ({
            field,
            target_field: this.identifySuggestedField(field),
          }))
          .sort(sortByStringThenNull);

        return createMappingGapsDetection({
          gaps,
          tasks: {
            processors: this.buildPipelineProcessors(gaps),
          },
        });
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private identifySuggestedField(fieldName: string) {
    return (
      ecsAlikeMappingsKeys.find((ecsField) => {
        const similarFieldNames = ecsAlikeMappings[ecsField];
        return similarFieldNames?.includes(fieldName);
      }) ?? null
    );
  }

  private buildPipelineProcessors(gaps: MappingGap[]): IngestProcessorContainer[] {
    return gaps.filter((gap) => Boolean(gap.target_field)).map(createRenameProcessor);
  }
}

const flatMappings = (
  properties: Record<PropertyName, MappingPropertyBase>,
  prefix = ''
): Record<PropertyName, MappingProperty> => {
  return Object.entries(properties).reduce((props, [propertyName, propertyObj]) => {
    const joinedPropertyName = [prefix, propertyName].filter(Boolean).join('.');

    if (propertyObj.properties) {
      return Object.assign(props, flatMappings(propertyObj.properties, joinedPropertyName));
    }

    props[joinedPropertyName] = propertyObj;
    return props;
  }, {} as Record<PropertyName, MappingProperty>);
};

const sortByStringThenNull = (curr: MappingGap, next: MappingGap) => {
  if (curr.target_field === null && next.target_field !== null) {
    return 1;
  } else if (curr.target_field !== null && next.target_field === null) {
    return -1;
  } else if (curr.target_field === null && next.target_field === null) {
    return 0;
  } else {
    return curr.target_field!.localeCompare(next.target_field!);
  }
};
