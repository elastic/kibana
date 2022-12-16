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
  ECS_MAPPING,
  INDEX_UNALLOWED_VALUES,
  INDEX_MAPPING,
  FIELD,
} from '../../../compare_fields_table/translations';
import * as i18n from '../translations';
import type { AllowedValue, EnrichedFieldMetadata, UnallowedValueCount } from '../../../types';

export const EMPTY_PLACEHOLDER = '-';

export const ECS_FIELD_REFERENCE_URL =
  'https://www.elastic.co/guide/en/ecs/current/ecs-field-reference.html';
export const ECS_REFERENCE_URL = 'https://www.elastic.co/guide/en/ecs/current/ecs-reference.html';
export const MAPPING_URL =
  'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html';

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

export const getIndexInvalidValues = (indexInvalidValues: UnallowedValueCount[]): string =>
  indexInvalidValues.length === 0
    ? getCodeFormattedValue(undefined)
    : indexInvalidValues
        .map(({ fieldName, count }) => `${getCodeFormattedValue(escape(fieldName))} (${count})`)
        .join(', ');

export const getMarkdownTableRows = (enrichedFieldMetadata: EnrichedFieldMetadata[]): string =>
  enrichedFieldMetadata
    .map(
      (x) =>
        `| ${escape(x.indexFieldName)} | ${getCodeFormattedValue(x.type)} | ${getCodeFormattedValue(
          x.indexFieldType
        )}  | ${getAllowedValues(x.allowed_values)} | ${getIndexInvalidValues(
          x.indexInvalidValues
        )} | ${escape(x.description ?? EMPTY_PLACEHOLDER)} |`
    )
    .join('\n');

export const getMarkdownComment = ({
  docsCount,
  enrichedFieldMetadata,
  indexName,
  suggestedAction,
  title,
}: {
  docsCount: number;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
  indexName: string;
  suggestedAction: string;
  title: string;
}) =>
  `
#### ${i18n.INDEX}: ${getCodeFormattedValue(indexName)}

${getCodeFormattedValue(`${docsCount}`)} ${i18n.DOCS}

#### ${escape(title)}
${escapePreserveNewlines(suggestedAction)}

${
  enrichedFieldMetadata.length > 0
    ? getMarkdownTableHeader([
        FIELD,
        ECS_MAPPING,
        INDEX_MAPPING,
        ECS_ALLOWED_VALUES,
        INDEX_UNALLOWED_VALUES,
        ECS_DESCRIPTION,
      ])
    : ''
}
${enrichedFieldMetadata.length > 0 ? getMarkdownTableRows(enrichedFieldMetadata) : ''}
`;

export const getCaseSummaryMarkdownComment = ({
  docsCount,
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  indexName,
  mappingUrl,
  version,
}: {
  docsCount: number;
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  indexName: string;
  mappingUrl: string;
  version: string;
}) =>
  `
## ${i18n.CASE_SUMMARY_MARKDOWN_TITLE}

${i18n.CASE_SUMMARY_MARKDOWN_DESCRIPTION({
  ecsFieldReferenceUrl: `${escape(ecsFieldReferenceUrl)}`,
  ecsReferenceUrl: `${escape(ecsReferenceUrl)}`,
  indexName: `${escape(indexName)}`,
  mappingUrl: `${escape(mappingUrl)}`,
  version: `${escape(version)}`,
})}

### ${i18n.INDEX}

\`\`\`
${escape(indexName)}
\`\`\`

${getCodeFormattedValue(`${docsCount}`)} ${i18n.DOCS}

### ${i18n.ECS_VERSION_MARKDOWN_COMMENT}

\`\`\`
${escape(version)}
\`\`\`
`;
