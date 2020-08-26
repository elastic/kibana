/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FunctionComponent } from 'react';

import {
  Append,
  Bytes,
  Circle,
  Convert,
  CSV,
  DateProcessor,
  DateIndexName,
  Dissect,
  DotExpander,
  Drop,
  Enrich,
  Fail,
  Foreach,
  GeoIP,
  Grok,
  Gsub,
  HtmlStrip,
  Inference,
  Join,
  Json,
} from '../manage_processor_form/processors';

// import { SetProcessor } from './processors/set';
// import { Gsub } from './processors/gsub';

interface FieldDescriptor {
  FieldsComponent?: FunctionComponent;
  docLinkPath: string;
  /**
   * A sentence case label that can be displayed to users
   */
  label: string;
}

type MapProcessorTypeToDescriptor = Record<string, FieldDescriptor>;

export const mapProcessorTypeToDescriptor: MapProcessorTypeToDescriptor = {
  append: {
    FieldsComponent: Append,
    docLinkPath: '/append-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.append', {
      defaultMessage: 'Append',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.append', {
      defaultMessage:
        'Appends one or more values to an existing array. Converts a scalar to an array and appends one or more values. Creates an array containing the provided values if the field does not exist.',
    }),
  },
  bytes: {
    FieldsComponent: Bytes,
    docLinkPath: '/bytes-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.bytes', {
      defaultMessage: 'Bytes',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.bytes', {
      defaultMessage:
        'Converts a human-readable byte value to its value in bytes. If the field is an array of strings, the processor converts all members of the array.',
    }),
  },
  circle: {
    FieldsComponent: Circle,
    docLinkPath: '/ingest-circle-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.circle', {
      defaultMessage: 'Circle',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.circle', {
      defaultMessage:
        'Converts circle definitions of shapes to regular polygons that approximate them. The error distance determines the accuracy of the polygon that represents the circle.',
    }),
  },
  convert: {
    FieldsComponent: Convert,
    docLinkPath: '/convert-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.convert', {
      defaultMessage: 'Convert',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.convert', {
      defaultMessage:
        'Converts a field in the currently ingested document to a different type, such as converting a string to an integer.',
    }),
  },
  csv: {
    FieldsComponent: CSV,
    docLinkPath: '/csv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.csv', {
      defaultMessage: 'CSV',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.csv', {
      defaultMessage: 'Extracts fields from a CSV line in a single text field within a document.',
    }),
  },
  date: {
    FieldsComponent: DateProcessor,
    docLinkPath: '/date-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.date', {
      defaultMessage: 'Date',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.date', {
      defaultMessage:
        'Parses dates from fields and uses the date or timestamp as the timestamp for the document.',
    }),
  },
  date_index_name: {
    FieldsComponent: DateIndexName,
    docLinkPath: '/date-index-name-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dateIndexName', {
      defaultMessage: 'Date index name',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.dateIndexName', {
      defaultMessage:
        'Points documents to the correct time-based index, based on a date or timestamp field in a document using the date math support in index names.',
    }),
  },
  dissect: {
    FieldsComponent: Dissect,
    docLinkPath: '/dissect-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dissect', {
      defaultMessage: 'Dissect',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.dissect', {
      defaultMessage:
        'Matches a single text field against a defined pattern to extract structured fields out of a single text field within a document.',
    }),
  },
  dot_expander: {
    FieldsComponent: DotExpander,
    docLinkPath: '/dot-expand-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dotExpander', {
      defaultMessage: 'Dot expander',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.dotExpander', {
      defaultMessage:
        'Expands a field containing dot notation into an object field and makes these fields accessible by other processors in the pipeline.',
    }),
  },
  drop: {
    FieldsComponent: Drop,
    docLinkPath: '/drop-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.drop', {
      defaultMessage: 'Drop',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.processors.helpText.drop', {
      defaultMessage:
        'Drops the document without raising any errors. Useful for preventing documents from getting indexed based other conditions.',
    }),
  },
  enrich: {
    FieldsComponent: Enrich,
    docLinkPath: '/ingest-enriching-data.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.enrich', {
      defaultMessage: 'Enrich',
    }),
  },
  fail: {
    FieldsComponent: Fail,
    docLinkPath: '/fail-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.fail', {
      defaultMessage: 'Fail',
    }),
  },
  foreach: {
    FieldsComponent: Foreach,
    docLinkPath: '/foreach-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.foreach', {
      defaultMessage: 'Foreach',
    }),
  },
  geoip: {
    FieldsComponent: GeoIP,
    docLinkPath: '/geoip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.geoip', {
      defaultMessage: 'GeoIP',
    }),
  },
  grok: {
    FieldsComponent: Grok,
    docLinkPath: '/grok-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.grok', {
      defaultMessage: 'Grok',
    }),
  },
  gsub: {
    FieldsComponent: Gsub,
    docLinkPath: '/gsub-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.gsub', {
      defaultMessage: 'Gsub',
    }),
  },
  html_strip: {
    FieldsComponent: HtmlStrip,
    docLinkPath: '/htmlstrip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.htmlStrip', {
      defaultMessage: 'HTML strip',
    }),
  },
  inference: {
    FieldsComponent: Inference,
    docLinkPath: '/inference-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.inference', {
      defaultMessage: 'Inference',
    }),
  },
  join: {
    FieldsComponent: Join,
    docLinkPath: '/join-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.join', {
      defaultMessage: 'Join',
    }),
  },
  json: {
    FieldsComponent: Json,
    docLinkPath: '/json-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.json', {
      defaultMessage: 'JSON',
    }),
  },
  kv: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/kv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.kv', {
      defaultMessage: 'KV',
    }),
  },
  lowercase: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/lowercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.lowercase', {
      defaultMessage: 'Lowercase',
    }),
  },
  pipeline: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/pipeline-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.pipeline', {
      defaultMessage: 'Pipeline',
    }),
  },
  remove: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/remove-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.remove', {
      defaultMessage: 'Remove',
    }),
  },
  rename: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/rename-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.rename', {
      defaultMessage: 'Rename',
    }),
  },
  script: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/script-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.script', {
      defaultMessage: 'Script',
    }),
  },
  set_security_user: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/ingest-node-set-security-user-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.setSecurityUser', {
      defaultMessage: 'Set security user',
    }),
  },
  split: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/split-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.split', {
      defaultMessage: 'Split',
    }),
  },
  sort: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/sort-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.sort', {
      defaultMessage: 'Sort',
    }),
  },
  trim: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/trim-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.trim', {
      defaultMessage: 'Trim',
    }),
  },
  uppercase: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/uppercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.uppercase', {
      defaultMessage: 'Uppercase',
    }),
  },
  urldecode: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/urldecode-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.urldecode', {
      defaultMessage: 'URL decode',
    }),
  },
  user_agent: {
    FieldsComponent: undefined, // TODO: Implement
    docLinkPath: '/user-agent-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.userAgent', {
      defaultMessage: 'User agent',
    }),
  },

  // --- The below processor descriptors have components implemented ---
  set: {
    FieldsComponent: undefined,
    docLinkPath: '/set-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.set', {
      defaultMessage: 'Set',
    }),
  },
};

export type ProcessorType = keyof typeof mapProcessorTypeToDescriptor;

export const getProcessorDescriptor = (
  type: ProcessorType | string
): FieldDescriptor | undefined => {
  return mapProcessorTypeToDescriptor[type as ProcessorType];
};
