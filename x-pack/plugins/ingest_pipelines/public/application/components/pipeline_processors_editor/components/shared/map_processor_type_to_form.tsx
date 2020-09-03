/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode, EuiLink } from '@elastic/eui';

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
  description?: string | ReactNode;
}

type MapProcessorTypeToDescriptor = Record<string, FieldDescriptor>;

export const mapProcessorTypeToDescriptor: MapProcessorTypeToDescriptor = {
  append: {
    FieldsComponent: Append,
    docLinkPath: '/append-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.append', {
      defaultMessage: 'Append',
    }),
  },
  bytes: {
    FieldsComponent: Bytes,
    docLinkPath: '/bytes-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.bytes', {
      defaultMessage: 'Bytes',
    }),
  },
  circle: {
    FieldsComponent: Circle,
    docLinkPath: '/ingest-circle-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.circle', {
      defaultMessage: 'Circle',
    }),
  },
  convert: {
    FieldsComponent: Convert,
    docLinkPath: '/convert-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.convert', {
      defaultMessage: 'Convert',
    }),
  },
  csv: {
    FieldsComponent: CSV,
    docLinkPath: '/csv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.csv', {
      defaultMessage: 'CSV',
    }),
  },
  date: {
    FieldsComponent: DateProcessor,
    docLinkPath: '/date-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.date', {
      defaultMessage: 'Date',
    }),
  },
  date_index_name: {
    FieldsComponent: DateIndexName,
    docLinkPath: '/date-index-name-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dateIndexName', {
      defaultMessage: 'Date index name',
    }),
  },
  dissect: {
    FieldsComponent: Dissect,
    docLinkPath: '/dissect-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dissect', {
      defaultMessage: 'Dissect',
    }),
  },
  dot_expander: {
    FieldsComponent: DotExpander,
    docLinkPath: '/dot-expand-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dotExpander', {
      defaultMessage: 'Dot expander',
    }),
  },
  drop: {
    FieldsComponent: Drop,
    docLinkPath: '/drop-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.drop', {
      defaultMessage: 'Drop',
    }),
  },
  enrich: {
    FieldsComponent: Enrich,
    docLinkPath: '/ingest-enriching-data.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.enrich', {
      defaultMessage: 'Enrich',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.ingestPipelines.processors.description.enrich"
        defaultMessage="Adds enrich data to incoming documents based on an {enrichPolicyLink}."
        values={{
          enrichPolicyLink: (
            <EuiLink external target="_blank" href={esDocUrl + '/ingest-enriching-data.html'}>
              {'enrich policy'}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  fail: {
    FieldsComponent: Fail,
    docLinkPath: '/fail-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.fail', {
      defaultMessage: 'Fail',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.fail', {
      defaultMessage:
        'Returns a custom error message on failure. Often used to notify requesters of required conditions.',
    }),
  },
  foreach: {
    FieldsComponent: Foreach,
    docLinkPath: '/foreach-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.foreach', {
      defaultMessage: 'Foreach',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.foreach', {
      defaultMessage: 'Applies an ingest processor to each value in an array.',
    }),
  },
  geoip: {
    FieldsComponent: GeoIP,
    docLinkPath: '/geoip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.geoip', {
      defaultMessage: 'GeoIP',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.geoip', {
      defaultMessage:
        'Adds geo data based on an IP address. Uses geo data from a Maxmind database file.',
    }),
  },
  grok: {
    FieldsComponent: Grok,
    docLinkPath: '/grok-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.grok', {
      defaultMessage: 'Grok',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.ingestPipelines.processors.description.grok"
        defaultMessage="Uses {grokLink} expressions to extract matches from a field."
        values={{
          grokLink: (
            <EuiLink external target="_blank" href={esDocUrl + '/grok-processor.html'}>
              {'grok'}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  gsub: {
    FieldsComponent: Gsub,
    docLinkPath: '/gsub-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.gsub', {
      defaultMessage: 'Gsub',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.gsub', {
      defaultMessage: 'Uses a regular expression to replace field substrings.',
    }),
  },
  html_strip: {
    FieldsComponent: HtmlStrip,
    docLinkPath: '/htmlstrip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.htmlStrip', {
      defaultMessage: 'HTML strip',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.htmlStrip', {
      defaultMessage: 'Removes HTML tags from a field.',
    }),
  },
  inference: {
    FieldsComponent: Inference,
    docLinkPath: '/inference-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.inference', {
      defaultMessage: 'Inference',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.inference', {
      defaultMessage:
        'Uses a pre-trained data frame analytics model to infer against incoming data.',
    }),
  },
  join: {
    FieldsComponent: Join,
    docLinkPath: '/join-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.join', {
      defaultMessage: 'Join',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.join', {
      defaultMessage:
        'Joins array elements into a string. Inserts a separator between each element.',
    }),
  },
  json: {
    FieldsComponent: Json,
    docLinkPath: '/json-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.json', {
      defaultMessage: 'JSON',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.json', {
      defaultMessage: 'Creates a JSON object from a compatible string.',
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
