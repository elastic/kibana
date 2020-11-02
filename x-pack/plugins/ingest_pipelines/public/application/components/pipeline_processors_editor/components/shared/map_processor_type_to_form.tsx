/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { ReactNode } from 'react';
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
  Kv,
  Lowercase,
  Pipeline,
  Remove,
  Rename,
  Script,
  SetProcessor,
  SetSecurityUser,
  Split,
  Sort,
  Trim,
  Uppercase,
  UrlDecode,
  UserAgent,
  FormFieldsComponent,
} from '../processor_form/processors';

interface FieldDescriptor {
  FieldsComponent?: FormFieldsComponent;
  docLinkPath: string;
  /**
   * A sentence case label that can be displayed to users
   */
  label: string;
  description?: string | ((esDocUrl: string) => ReactNode);
}

type MapProcessorTypeToDescriptor = Record<string, FieldDescriptor>;

export const mapProcessorTypeToDescriptor: MapProcessorTypeToDescriptor = {
  append: {
    FieldsComponent: Append,
    docLinkPath: '/append-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.append', {
      defaultMessage: 'Append',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.append', {
      defaultMessage:
        "Appends values to a field's array. If the field contains a single value, the processor first converts it to an array. If the field doesn't exist, the processor creates an array containing the appended values.",
    }),
  },
  bytes: {
    FieldsComponent: Bytes,
    docLinkPath: '/bytes-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.bytes', {
      defaultMessage: 'Bytes',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.bytes', {
      defaultMessage:
        'Converts digital storage units to bytes. For example, 1KB becomes 1024 bytes.',
    }),
  },
  circle: {
    FieldsComponent: Circle,
    docLinkPath: '/ingest-circle-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.circle', {
      defaultMessage: 'Circle',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.circle', {
      defaultMessage: 'Converts a circle definition into an approximate polygon.',
    }),
  },
  convert: {
    FieldsComponent: Convert,
    docLinkPath: '/convert-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.convert', {
      defaultMessage: 'Convert',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.convert', {
      defaultMessage:
        'Converts a field to a different data type. For example, you can convert a string to an long.',
    }),
  },
  csv: {
    FieldsComponent: CSV,
    docLinkPath: '/csv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.csv', {
      defaultMessage: 'CSV',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.csv', {
      defaultMessage: 'Extracts field values from CSV data.',
    }),
  },
  date: {
    FieldsComponent: DateProcessor,
    docLinkPath: '/date-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.date', {
      defaultMessage: 'Date',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.date', {
      defaultMessage: 'Converts a date to a document timestamp.',
    }),
  },
  date_index_name: {
    FieldsComponent: DateIndexName,
    docLinkPath: '/date-index-name-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dateIndexName', {
      defaultMessage: 'Date index name',
    }),
    description: () => (
      <FormattedMessage
        id="xpack.ingestPipelines.processors.description.dateIndexName"
        defaultMessage="Uses a date or timestamp to add documents to the correct time-based index. Index names must use a date math pattern, such as {value}."
        values={{ value: <EuiCode inline>{'my-index-yyyy-MM-dd'}</EuiCode> }}
      />
    ),
  },
  dissect: {
    FieldsComponent: Dissect,
    docLinkPath: '/dissect-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dissect', {
      defaultMessage: 'Dissect',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.dissect', {
      defaultMessage: 'Uses dissect patterns to extract matches from a field.',
    }),
  },
  dot_expander: {
    FieldsComponent: DotExpander,
    docLinkPath: '/dot-expand-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dotExpander', {
      defaultMessage: 'Dot expander',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.dotExpander', {
      defaultMessage:
        'Expands a field containing dot notation into an object field. The object field is then accessible by other processors in the pipeline.',
    }),
  },
  drop: {
    FieldsComponent: Drop,
    docLinkPath: '/drop-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.drop', {
      defaultMessage: 'Drop',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.drop', {
      defaultMessage:
        'Drops documents without returning an error. Used to only index documents that meet specified conditions.',
    }),
  },
  enrich: {
    FieldsComponent: Enrich,
    docLinkPath: '/ingest-enriching-data.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.enrich', {
      defaultMessage: 'Enrich',
    }),
    description: (esDocUrl) => {
      return (
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
      );
    },
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
    description: (esDocUrl) => {
      return (
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
      );
    },
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
    FieldsComponent: Kv,
    docLinkPath: '/kv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.kv', {
      defaultMessage: 'Key-value (KV)',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.kv', {
      defaultMessage: 'Extracts fields from a string containing key-value pairs.',
    }),
  },
  lowercase: {
    FieldsComponent: Lowercase,
    docLinkPath: '/lowercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.lowercase', {
      defaultMessage: 'Lowercase',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.lowercase', {
      defaultMessage: 'Converts a string to lowercase.',
    }),
  },
  pipeline: {
    FieldsComponent: Pipeline,
    docLinkPath: '/pipeline-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.pipeline', {
      defaultMessage: 'Pipeline',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.pipeline', {
      defaultMessage: 'Runs another ingest node pipeline.',
    }),
  },
  remove: {
    FieldsComponent: Remove,
    docLinkPath: '/remove-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.remove', {
      defaultMessage: 'Remove',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.remove', {
      defaultMessage: 'Removes one or more fields.',
    }),
  },
  rename: {
    FieldsComponent: Rename,
    docLinkPath: '/rename-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.rename', {
      defaultMessage: 'Rename',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.rename', {
      defaultMessage: 'Renames an existing field.',
    }),
  },
  script: {
    FieldsComponent: Script,
    docLinkPath: '/script-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.script', {
      defaultMessage: 'Script',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.script', {
      defaultMessage: 'Runs a script on incoming documents.',
    }),
  },
  set: {
    FieldsComponent: SetProcessor,
    docLinkPath: '/set-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.set', {
      defaultMessage: 'Set',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.set', {
      defaultMessage: 'Sets the value of a field.',
    }),
  },
  set_security_user: {
    FieldsComponent: SetSecurityUser,
    docLinkPath: '/ingest-node-set-security-user-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.setSecurityUser', {
      defaultMessage: 'Set security user',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.setSecurityUser', {
      defaultMessage:
        'Adds details about the current user, such user name and email address, to incoming documents. Requires an authenticated user for the indexing request.',
    }),
  },
  sort: {
    FieldsComponent: Sort,
    docLinkPath: '/sort-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.sort', {
      defaultMessage: 'Sort',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.sort', {
      defaultMessage: "Sorts a field's array elements.",
    }),
  },
  split: {
    FieldsComponent: Split,
    docLinkPath: '/split-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.split', {
      defaultMessage: 'Split',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.split', {
      defaultMessage: 'Splits a field value into an array.',
    }),
  },
  trim: {
    FieldsComponent: Trim,
    docLinkPath: '/trim-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.trim', {
      defaultMessage: 'Trim',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.trim', {
      defaultMessage: 'Removes leading and trailing whitespace from a string.',
    }),
  },
  uppercase: {
    FieldsComponent: Uppercase,
    docLinkPath: '/uppercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.uppercase', {
      defaultMessage: 'Uppercase',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.uppercase', {
      defaultMessage: 'Converts a string to uppercase.',
    }),
  },
  urldecode: {
    FieldsComponent: UrlDecode,
    docLinkPath: '/urldecode-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.urldecode', {
      defaultMessage: 'URL decode',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.urldecode', {
      defaultMessage: 'Decodes a URL-encoded string.',
    }),
  },
  user_agent: {
    FieldsComponent: UserAgent,
    docLinkPath: '/user-agent-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.userAgent', {
      defaultMessage: 'User agent',
    }),
    description: i18n.translate('xpack.ingestPipelines.processors.description.userAgent', {
      defaultMessage: "Extracts values from a browser's user agent string.",
    }),
  },
};

export type ProcessorType = keyof typeof mapProcessorTypeToDescriptor;

export const getProcessorDescriptor = (
  type: ProcessorType | string
): FieldDescriptor | undefined => {
  return mapProcessorTypeToDescriptor[type as ProcessorType];
};
