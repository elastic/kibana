/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  UriParts,
} from '../processor_form/processors';

interface FieldDescriptor {
  FieldsComponent?: FormFieldsComponent;
  docLinkPath: string;
  /**
   * A sentence case label that can be displayed to users
   */
  label: string;
  /**
   * A general description of the processor type
   */
  typeDescription?: string | ((esDocUrl: string) => ReactNode);
  /**
   * Default
   */
  getDefaultDescription: (processorOptions: Record<string, string>) => string | undefined;
}

type MapProcessorTypeToDescriptor = Record<string, FieldDescriptor>;

export const mapProcessorTypeToDescriptor: MapProcessorTypeToDescriptor = {
  append: {
    FieldsComponent: Append,
    docLinkPath: '/append-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.append', {
      defaultMessage: 'Append',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.append', {
      defaultMessage:
        "Appends values to a field's array. If the field contains a single value, the processor first converts it to an array. If the field doesn't exist, the processor creates an array containing the appended values.",
    }),
    getDefaultDescription: ({ field, value }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.append', {
        defaultMessage: 'Appends "{value}" to the "{field}" field',
        values: {
          field,
          value,
        },
      }),
  },
  bytes: {
    FieldsComponent: Bytes,
    docLinkPath: '/bytes-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.bytes', {
      defaultMessage: 'Bytes',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.bytes', {
      defaultMessage:
        'Converts digital storage units to bytes. For example, 1KB becomes 1024 bytes.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.bytes', {
        defaultMessage:
          'Converts circle definition from "{field}" to regular polygons on "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  circle: {
    FieldsComponent: Circle,
    docLinkPath: '/ingest-circle-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.circle', {
      defaultMessage: 'Circle',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.circle', {
      defaultMessage: 'Converts a circle definition into an approximate polygon.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.circle', {
        defaultMessage: 'Renames the "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  convert: {
    FieldsComponent: Convert,
    docLinkPath: '/convert-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.convert', {
      defaultMessage: 'Convert',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.convert', {
      defaultMessage:
        'Converts a field to a different data type. For example, you can convert a string to an long.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field, type }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.convert', {
        defaultMessage: 'Converts value on "{field}" to type "{type}", to field "{target_field}"',
        values: {
          field,
          type,
          target_field: targetField,
        },
      }),
  },
  csv: {
    FieldsComponent: CSV,
    docLinkPath: '/csv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.csv', {
      defaultMessage: 'CSV',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.csv', {
      defaultMessage: 'Extracts field values from CSV data.',
    }),
    getDefaultDescription: ({ field, target_field: targetField }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.csv', {
        defaultMessage: 'Extract CSV values from "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  date: {
    FieldsComponent: DateProcessor,
    docLinkPath: '/date-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.date', {
      defaultMessage: 'Date',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.date', {
      defaultMessage: 'Converts a date to a document timestamp.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = '@timestamp' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.date', {
        defaultMessage: 'Converts the string on "{field}" to a date type on field "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  date_index_name: {
    FieldsComponent: DateIndexName,
    docLinkPath: '/date-index-name-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dateIndexName', {
      defaultMessage: 'Date index name',
    }),
    typeDescription: () => (
      <FormattedMessage
        id="xpack.ingestPipelines.processors.description.dateIndexName"
        defaultMessage="Uses a date or timestamp to add documents to the correct time-based index. Index names must use a date math pattern, such as {value}."
        values={{ value: <EuiCode>{'my-index-yyyy-MM-dd'}</EuiCode> }}
      />
    ),
    getDefaultDescription: ({ field, index_name_prefix: indexNamePrefix = 'with no prefix' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.date_index_name', {
        defaultMessage:
          'Sets the target index name based on timestamp value in "{field}", with the prefix "{index_name_prefix}"',
        values: {
          field,
          index_name_prefix: indexNamePrefix,
        },
      }),
  },
  dissect: {
    FieldsComponent: Dissect,
    docLinkPath: '/dissect-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dissect', {
      defaultMessage: 'Dissect',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.dissect', {
      defaultMessage: 'Uses dissect patterns to extract matches from a field.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.dissect', {
        defaultMessage: 'Dissects values from the string on field "{field}"',
        values: {
          field,
        },
      }),
  },
  dot_expander: {
    FieldsComponent: DotExpander,
    docLinkPath: '/dot-expand-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.dotExpander', {
      defaultMessage: 'Dot expander',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.dotExpander', {
      defaultMessage:
        'Expands a field containing dot notation into an object field. The object field is then accessible by other processors in the pipeline.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.dot_expander', {
        defaultMessage: 'Expands dot annotated field "{field}"',
        values: {
          field,
        },
      }),
  },
  drop: {
    FieldsComponent: Drop,
    docLinkPath: '/drop-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.drop', {
      defaultMessage: 'Drop',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.drop', {
      defaultMessage:
        'Drops documents without returning an error. Used to only index documents that meet specified conditions.',
    }),
    getDefaultDescription: ({ if: value }) =>
      value
        ? i18n.translate('xpack.ingestPipelines.processors.defaultDescription.drop', {
            defaultMessage: 'Drops document if the current conditions are met "{if}"',
            values: {
              if: value,
            },
          })
        : undefined,
  },
  enrich: {
    FieldsComponent: Enrich,
    docLinkPath: '/ingest-enriching-data.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.enrich', {
      defaultMessage: 'Enrich',
    }),
    typeDescription: (esDocUrl) => {
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
    getDefaultDescription: ({ field, policy_name: policyName, target_field: targetField }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.enrich', {
        defaultMessage:
          'Enriches data to "{target_field}" if the "{policy_name}" policy matches "{field}"',
        values: {
          field,
          policy_name: policyName,
          target_field: targetField,
        },
      }),
  },
  fail: {
    FieldsComponent: Fail,
    docLinkPath: '/fail-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.fail', {
      defaultMessage: 'Fail',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.fail', {
      defaultMessage:
        'Returns a custom error message on failure. Often used to notify requesters of required conditions.',
    }),
    getDefaultDescription: ({ if: value }) =>
      value
        ? i18n.translate('xpack.ingestPipelines.processors.defaultDescription.fail', {
            defaultMessage: 'Raises an exception if the current conditions are met "{if}"',
            values: {
              if: value,
            },
          })
        : undefined,
  },
  foreach: {
    FieldsComponent: Foreach,
    docLinkPath: '/foreach-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.foreach', {
      defaultMessage: 'Foreach',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.foreach', {
      defaultMessage: 'Applies an ingest processor to each value in an array.',
    }),
    getDefaultDescription: ({ field, processor }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.foreach', {
        defaultMessage: 'For each object in "{field}", run the "{processorName}" processor.',
        values: {
          field,
          processorName: ((processor as unknown) as { name: string }).name,
        },
      }),
  },
  geoip: {
    FieldsComponent: GeoIP,
    docLinkPath: '/geoip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.geoip', {
      defaultMessage: 'GeoIP',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.geoip', {
      defaultMessage:
        'Adds geo data based on an IP address. Uses geo data from a Maxmind database file.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = 'geoip' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.geoip', {
        defaultMessage:
          'Enriches document with GeoIP information based on value in "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  grok: {
    FieldsComponent: Grok,
    docLinkPath: '/grok-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.grok', {
      defaultMessage: 'Grok',
    }),
    typeDescription: (esDocUrl) => {
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
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.grok', {
        defaultMessage: 'Runs grok patterns on string value in "{field}"',
        values: {
          field,
        },
      }),
  },
  gsub: {
    FieldsComponent: Gsub,
    docLinkPath: '/gsub-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.gsub', {
      defaultMessage: 'Gsub',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.gsub', {
      defaultMessage: 'Uses a regular expression to replace field substrings.',
    }),
    getDefaultDescription: ({ pattern, field, replacement }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.gsub', {
        defaultMessage: 'Replaces values matching "{pattern}" in "{field}" with "{replacement}"',
        values: {
          pattern,
          field,
          replacement,
        },
      }),
  },
  html_strip: {
    FieldsComponent: HtmlStrip,
    docLinkPath: '/htmlstrip-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.htmlStrip', {
      defaultMessage: 'HTML strip',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.htmlStrip', {
      defaultMessage: 'Removes HTML tags from a field.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.html_strip', {
        defaultMessage:
          'Strips HTML tags from "{field}", and stores the results in "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  inference: {
    FieldsComponent: Inference,
    docLinkPath: '/inference-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.inference', {
      defaultMessage: 'Inference',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.inference', {
      defaultMessage:
        'Uses a pre-trained data frame analytics model to infer against incoming data.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.rename', {
        defaultMessage: 'Renames the "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  join: {
    FieldsComponent: Join,
    docLinkPath: '/join-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.join', {
      defaultMessage: 'Join',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.join', {
      defaultMessage:
        'Joins array elements into a string. Inserts a separator between each element.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.join', {
        defaultMessage: 'Joins each element of the array stored in "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  json: {
    FieldsComponent: Json,
    docLinkPath: '/json-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.json', {
      defaultMessage: 'JSON',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.json', {
      defaultMessage: 'Creates a JSON object from a compatible string.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.json', {
        defaultMessage: 'Converts the string on "{field}" to JSON values under "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  kv: {
    FieldsComponent: Kv,
    docLinkPath: '/kv-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.kv', {
      defaultMessage: 'Key-value (KV)',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.kv', {
      defaultMessage: 'Extracts fields from a string containing key-value pairs.',
    }),
    getDefaultDescription: ({ field, field_split: fieldSplit, value_split: valueSplit }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.kv', {
        defaultMessage:
          'Splits key-value pairs stored in "{field}", with field split "{field_split}" and value split "{value_split}"',
        values: {
          field,
          field_split: fieldSplit,
          value_split: valueSplit,
        },
      }),
  },
  lowercase: {
    FieldsComponent: Lowercase,
    docLinkPath: '/lowercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.lowercase', {
      defaultMessage: 'Lowercase',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.lowercase', {
      defaultMessage: 'Converts a string to lowercase.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.lowercase', {
        defaultMessage: 'Converts values in "{field}" to lowercase',
        values: {
          field,
        },
      }),
  },
  pipeline: {
    FieldsComponent: Pipeline,
    docLinkPath: '/pipeline-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.pipeline', {
      defaultMessage: 'Pipeline',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.pipeline', {
      defaultMessage: 'Runs another ingest node pipeline.',
    }),
    getDefaultDescription: ({ name }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.pipeline', {
        defaultMessage: 'Executes pipeline "{name}"',
        values: {
          name,
        },
      }),
  },
  remove: {
    FieldsComponent: Remove,
    docLinkPath: '/remove-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.remove', {
      defaultMessage: 'Remove',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.remove', {
      defaultMessage: 'Removes one or more fields.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.remove', {
        defaultMessage: 'Removes field(s) "{field}"',
        values: {
          field: Array.isArray(field as unknown)
            ? ((field as unknown) as string[]).join(',')
            : field,
        },
      }),
  },
  rename: {
    FieldsComponent: Rename,
    docLinkPath: '/rename-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.rename', {
      defaultMessage: 'Rename',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.rename', {
      defaultMessage: 'Renames an existing field.',
    }),
    getDefaultDescription: ({ field, target_field: targetField }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.rename', {
        defaultMessage: 'Renames "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  script: {
    FieldsComponent: Script,
    docLinkPath: '/script-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.script', {
      defaultMessage: 'Script',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.script', {
      defaultMessage: 'Runs a script on incoming documents.',
    }),
    // TODO: Decide whether requires user to provide a meaningful description
    getDefaultDescription: () => undefined,
  },
  set: {
    FieldsComponent: SetProcessor,
    docLinkPath: '/set-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.set', {
      defaultMessage: 'Set',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.set', {
      defaultMessage: 'Sets the value of a field.',
    }),
    getDefaultDescription: ({ field, value }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.set', {
        defaultMessage: 'Sets value of "{field}" to "{value}"',
        values: {
          field,
          value,
        },
      }),
  },
  set_security_user: {
    FieldsComponent: SetSecurityUser,
    docLinkPath: '/ingest-node-set-security-user-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.setSecurityUser', {
      defaultMessage: 'Set security user',
    }),
    typeDescription: i18n.translate(
      'xpack.ingestPipelines.processors.description.setSecurityUser',
      {
        defaultMessage:
          'Adds details about the current user, such user name and email address, to incoming documents. Requires an authenticated user for the indexing request.',
      }
    ),
    // TODO: Decide whether meaningful description can only be provided by user?
    getDefaultDescription: () => undefined,
  },
  sort: {
    FieldsComponent: Sort,
    docLinkPath: '/sort-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.sort', {
      defaultMessage: 'Sort',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.sort', {
      defaultMessage: "Sorts a field's array elements.",
    }),
    getDefaultDescription: ({ field, target_field: targetField = field, order = 'asc' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.sort', {
        defaultMessage:
          'Sorts elements in the array "{field}" by order "{order}" to "{target_field}"',
        values: {
          field,
          order,
          target_field: targetField,
        },
      }),
  },
  split: {
    FieldsComponent: Split,
    docLinkPath: '/split-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.split', {
      defaultMessage: 'Split',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.split', {
      defaultMessage: 'Splits a field value into an array.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.split', {
        defaultMessage: 'Splits the string stored in "{field}" to an array in "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  trim: {
    FieldsComponent: Trim,
    docLinkPath: '/trim-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.trim', {
      defaultMessage: 'Trim',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.trim', {
      defaultMessage: 'Removes leading and trailing whitespace from a string.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.trim', {
        defaultMessage: 'Trims whitespaces from "{field}"',
        values: {
          field,
        },
      }),
  },
  uppercase: {
    FieldsComponent: Uppercase,
    docLinkPath: '/uppercase-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.uppercase', {
      defaultMessage: 'Uppercase',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.uppercase', {
      defaultMessage: 'Converts a string to uppercase.',
    }),
    getDefaultDescription: ({ field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.uppercase', {
        defaultMessage: 'Converts value stored in "{field}" to uppercase',
        values: {
          field,
        },
      }),
  },
  urldecode: {
    FieldsComponent: UrlDecode,
    docLinkPath: '/urldecode-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.urldecode', {
      defaultMessage: 'URL decode',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.urldecode', {
      defaultMessage: 'Decodes a URL-encoded string.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = field }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.url_decode', {
        defaultMessage: 'Decodes the URL string in "{field}" to "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  user_agent: {
    FieldsComponent: UserAgent,
    docLinkPath: '/user-agent-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.userAgent', {
      defaultMessage: 'User agent',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.description.userAgent', {
      defaultMessage: "Extracts values from a browser's user agent string.",
    }),
    getDefaultDescription: ({ field, target_field: targetField = 'user_agent' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.user_agent', {
        defaultMessage:
          'Extracts the user agent from "{field}" and stores the results in "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
  uri_parts: {
    FieldsComponent: UriParts,
    docLinkPath: '/uri-parts-processor.html',
    label: i18n.translate('xpack.ingestPipelines.processors.label.uriPartsLabel', {
      defaultMessage: 'URI parts',
    }),
    typeDescription: i18n.translate('xpack.ingestPipelines.processors.uriPartsDescription', {
      defaultMessage:
        'Parses a Uniform Resource Identifier (URI) string and extracts its components as an object.',
    }),
    getDefaultDescription: ({ field, target_field: targetField = 'url' }) =>
      i18n.translate('xpack.ingestPipelines.processors.defaultDescription.uri_parts', {
        defaultMessage:
          'Splits up the URL string in "{field}" and stores the result in "{target_field}"',
        values: {
          field,
          target_field: targetField,
        },
      }),
  },
};

export type ProcessorType = keyof typeof mapProcessorTypeToDescriptor;

export const getProcessorDescriptor = (
  type: ProcessorType | string
): FieldDescriptor | undefined => {
  return mapProcessorTypeToDescriptor[type as ProcessorType];
};
