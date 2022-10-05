/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { repeat } from 'lodash/fp';

import {
  ECS_ALLOWED_VALUES,
  ECS_DESCRIPTION,
  ECS_TYPE,
  INDEX_INVALID_VALUES,
  INDEX_TYPE,
  NAME,
} from '../../../compare_fields_table/translations';
import * as i18n from '../translations';
import type { AllowedValue, EnrichedFieldMetadata } from '../../../types';

export const EMPTY_PLACEHOLDER = '-';

export const ECS_FIELD_REFERENCE_URL =
  'https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html';
export const ECS_REFERENCE_URL = 'https://www.elastic.co/guide/en/ecs/current/ecs-reference.html';
export const UPDATE_MAPPING_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-mapping.html';

export const escape = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('\n', ' ').replaceAll('|', '\\|') : content;

export const escapePreserveNewlines = (content: string | undefined): string | undefined =>
  content != null ? content.replaceAll('|', '\\|') : content;

export const getHeaderSeparator = (headerLength: number): string => repeat(headerLength + 2, '-');

export const getMarkdownTableHeader = (headerNames: string[]) => `
| ${headerNames.map((name) => `${escape(name)} | `).join('')}
|${headerNames.map((name) => `${getHeaderSeparator(name.length)}|`).join('')}`;

export const getCodeFormattedValue = (value: string | undefined) =>
  `\`${escape(value ?? EMPTY_PLACEHOLDER)}\``;

export const getAllowedValues = (allowedValues: AllowedValue[] | undefined): string =>
  allowedValues == null
    ? getCodeFormattedValue(undefined)
    : allowedValues.map((x) => getCodeFormattedValue(x.name)).join(', ');

export const getIndexInvalidValues = (indexInvalidValues: string[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues.map((x) => getCodeFormattedValue(x)).join(', ');

export const getMarkdownTableRows = (enrichedFieldMetadata: EnrichedFieldMetadata[]): string =>
  enrichedFieldMetadata
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getCodeFormattedValue(
          x.indexFieldType
        )} | ${getCodeFormattedValue(x.type)} | ${getIndexInvalidValues(
          x.indexInvalidValues
        )} | ${getAllowedValues(x.allowed_values)} | ${escape(
          x.description ?? EMPTY_PLACEHOLDER
        )} |`
    )
    .join('\n');

export const getMarkdownComment = ({
  enrichedFieldMetadata,
  indexName,
  suggestedAction,
  title,
}: {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  suggestedAction: string;
  title: string;
}) =>
  `
#### ${i18n.INDEX}: ${getCodeFormattedValue(indexName)}
#### ${escape(title)}
${escapePreserveNewlines(suggestedAction)}

${
  enrichedFieldMetadata.length > 0
    ? getMarkdownTableHeader([
        NAME,
        INDEX_TYPE,
        ECS_TYPE,
        INDEX_INVALID_VALUES,
        ECS_ALLOWED_VALUES,
        ECS_DESCRIPTION,
      ])
    : ''
}
${enrichedFieldMetadata.length > 0 ? getMarkdownTableRows(enrichedFieldMetadata) : ''}
`;

export const getCaseSummaryMarkdownComment = ({
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  indexName,
  updateMappingUrl,
  version,
}: {
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  indexName: string;
  updateMappingUrl: string;
  version: string;
}) =>
  `
## ${i18n.CASE_SUMMARY_MARKDOWN_TITLE}

${i18n.CASE_SUMMARY_MARKDOWN_DESCRIPTION({
  ecsFieldReferenceUrl: `${escape(ecsFieldReferenceUrl)}`,
  ecsReferenceUrl: `${escape(ecsReferenceUrl)}`,
  indexName: `${escape(indexName)}`,
  updateMappingUrl: `${escape(updateMappingUrl)}`,
  version: `${escape(version)}`,
})}

### ${i18n.INDEX}

\`\`\`
${escape(indexName)}
\`\`\`

### ${i18n.ECS_VERSION_MARKDOWN_COMMENT}


\`\`\`
${escape(version)}
\`\`\`
`;
