/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_CASE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.addToCaseButton',
  {
    defaultMessage: 'Add to case',
  }
);

export const ALL = i18n.translate('xpack.securitySolution.dataQuality.indexProperties.allTab', {
  defaultMessage: 'All',
});

export const ALL_CALLOUT = (version: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.allCallout', {
    values: { version },
    defaultMessage:
      "All mappings for the fields in this index, including fields that comply with the Elastic Common Schema (ECS), version {version}, and fields that don't",
  });

export const ALL_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.allCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      'All {fieldCount} {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const ALL_EMPTY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.allCalloutEmptyContent',
  {
    defaultMessage: 'This index does not contain any mappings',
  }
);

export const ALL_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.allCalloutEmptyTitle',
  {
    defaultMessage: 'No mappings',
  }
);

export const CASE_SUMMARY_MARKDOWN_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.caseSummaryMarkdownTitle',
  {
    defaultMessage: 'Data quality',
  }
);

export const CASE_SUMMARY_MARKDOWN_DESCRIPTION = ({
  ecsFieldReferenceUrl,
  ecsReferenceUrl,
  indexName,
  mappingUrl,
  version,
}: {
  ecsFieldReferenceUrl: string;
  ecsReferenceUrl: string;
  indexName: string;
  mappingUrl: string;
  version: string;
}) =>
  i18n.translate(
    'xpack.securitySolution.dataQuality.indexProperties.caseSummaryMarkdownDescription',
    {
      values: { ecsFieldReferenceUrl, ecsReferenceUrl, indexName, mappingUrl, version },
      defaultMessage:
        'The `{indexName}` index has [mappings]({mappingUrl}) or field values that are different than the [Elastic Common Schema]({ecsReferenceUrl}) (ECS), version `{version}` [definitions]({ecsFieldReferenceUrl}).',
    }
  );

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.copyToClipboardButton',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const CUSTOM_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.custonDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Custom detection engine rules work',
  }
);

export const DOCS = i18n.translate('xpack.securitySolution.dataQuality.indexProperties.docsLabel', {
  defaultMessage: 'Docs',
});

export const ECS_COMPLIANT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsCompliantTab',
  {
    defaultMessage: 'ECS compliant',
  }
);

export const ECS_COMPLIANT_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.ecsCompliantCallout', {
    values: { fieldCount, version },
    defaultMessage:
      'The {fieldCount, plural, =1 {type and values for this field comply} other {types and values of these fields comply}} with the Elastic Common Schema (ECS), version {version}',
  });

export const ECS_COMPLIANT_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.ecsCompliantCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount} ECS compliant {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const ECS_COMPLIANT_EMPTY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsCompliantEmptyContent',
  {
    defaultMessage:
      'None of the field mappings in this index comply with the Elastic Common Schema (ECS). The index must (at least) contain an @timestamp date field.',
  }
);

export const ECS_VERSION_MARKDOWN_COMMENT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsVersionMarkdownComment',
  {
    defaultMessage: 'Elastic Common Schema (ECS) version',
  }
);

export const INDEX = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.indexMarkdown',
  {
    defaultMessage: 'Index',
  }
);

export const ECS_COMPLIANT_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsCompliantEmptyTitle',
  {
    defaultMessage: 'No ECS compliant Mappings',
  }
);

export const ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsCompliantMappingsAreFullySupportedMessage',
  {
    defaultMessage: '✅ ECS compliant mappings and field values are fully supported',
  }
);

export const ERROR_LOADING_MAPPINGS_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingMappingsTitle',
  {
    defaultMessage: 'Unable to load index mappings',
  }
);

export const ERROR_LOADING_MAPPINGS_BODY = (error: string) =>
  i18n.translate('xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingMappingsBody', {
    values: { error },
    defaultMessage: 'There was a problem loading mappings: {error}',
  });

export const ERROR_LOADING_UNALLOWED_VALUES_BODY = (error: string) =>
  i18n.translate(
    'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingUnallowedValuesBody',
    {
      values: { error },
      defaultMessage: 'There was a problem loading unallowed values: {error}',
    }
  );

export const ERROR_LOADING_UNALLOWED_VALUES_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyErrorPrompt.errorLoadingUnallowedValuesTitle',
  {
    defaultMessage: 'Unable to load unallowed values',
  }
);

export const LOADING_MAPPINGS = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyLoadingPrompt.loadingMappingsPrompt',
  {
    defaultMessage: 'Loading mappings',
  }
);

export const LOADING_UNALLOWED_VALUES = i18n.translate(
  'xpack.securitySolution.dataQuality.emptyLoadingPrompt.loadingUnallowedValuesPrompt',
  {
    defaultMessage: 'Loading unallowed values',
  }
);

export const SUMMARY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.summaryTab',
  {
    defaultMessage: 'Summary',
  }
);

export const MISSING_TIMESTAMP_CALLOUT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.missingTimestampCallout',
  {
    defaultMessage:
      'Consider adding an @timestamp (date) field mapping to this index, as required by the Elastic Common Schema (ECS), because:',
  }
);

export const MISSING_TIMESTAMP_CALLOUT_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.missingTimestampCalloutTitle',
  {
    defaultMessage: 'Missing an @timestamp (date) field mapping for this index',
  }
);

export const NON_ECS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.nonEcsTab',
  {
    defaultMessage: 'Non ECS',
  }
);

export const NON_ECS_CALLOUT = ({ fieldCount, version }: { fieldCount: number; version: string }) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.nonEcsCallout', {
    values: { fieldCount, version },
    defaultMessage:
      '{fieldCount, plural, =1 {This field is not} other {These fields are not}} defined by the Elastic Common Schema (ECS), version {version}. An index may contain non ECS fields, however:',
  });

export const NON_ECS_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.nonEcsCallout', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount} Non ECS {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const NON_ECS_EMPTY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.nonEcsEmptyContent',
  {
    defaultMessage: 'All the field mappings in this index are defined by the Elastic Common Schema',
  }
);

export const NON_ECS_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.nonEcsEmptyTitle',
  {
    defaultMessage: 'All field mappings defined by ECS',
  }
);

export const NOT_ECS_COMPLIANT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantTab',
  {
    defaultMessage: 'Not ECS compliant',
  }
);

export const NOT_ECS_COMPLIANT_CALLOUT = ({
  fieldCount,
  version,
}: {
  fieldCount: number;
  version: string;
}) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantCallout', {
    values: { fieldCount, version },
    defaultMessage:
      "Fields are Not ECS Compliant when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version {version}. Sometimes, indices created by older integrations will have mappings or values that were, but are no longer compliant.",
  });

export const NOT_ECS_COMPLIANT_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount} Not ECS compliant {fieldCount, plural, =1 {field} other {fields}}',
  });

export const NOT_ECS_COMPLIANT_EMPTY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantEmptyContent',
  {
    defaultMessage:
      'All of the field mappings in this index have types that match the Elastic Common Schema (ECS) types. All fields with values required by ECS were correct.',
  }
);

export const NOT_ECS_COMPLIANT_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantEmptyTitle',
  {
    defaultMessage: 'All field mappings and values are ECS compliant',
  }
);

export const DETECTION_ENGINE_RULES_WILL_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.detectionEngineRulesWillWorkMessage',
  {
    defaultMessage: '✅ Detection engine rules will work for these fields',
  }
);

export const DETECTION_ENGINE_RULES_WONT_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.detectionEngineRulesWontWorkMessage',
  {
    defaultMessage:
      '❌ Detection engine rules referencing these fields may not match them correctly',
  }
);

export const OTHER_APP_CAPABILITIES_WORK_PROPERLY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.otherAppCapabilitiesWorkProperlyMessage',
  {
    defaultMessage: '✅ Other app capabilities work properly',
  }
);

export const PAGES_DISPLAY_EVENTS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.pagesDisplayEventsMessage',
  {
    defaultMessage: '✅ Pages display events and fields correctly',
  }
);

export const PAGES_MAY_NOT_DISPLAY_FIELDS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.pagesMayNotDisplayFieldsMessage',
  {
    defaultMessage: '🌕 Some pages and features may not display these fields',
  }
);

export const PAGES_WONT_DISPLAY_EVENTS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.pagesWontDisplayEventsMessage',
  {
    defaultMessage:
      '❌ Pages may not display events or fields due to unexpected field mappings or values',
  }
);

export const PRE_BUILT_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.preBuiltDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Pre-built detection engine rules work',
  }
);

export const PRE_BUILT_DETECTION_ENGINE_RULES_WONT_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.preBuiltDetectionEngineRulesWontWorkMessage',
  {
    defaultMessage: "🌕 Pre-built detection engine rules won't match these fields",
  }
);

export const MAPPINGS_THAT_CONFLICT_WITH_ECS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.mappingThatConflictWithEcsMessage',
  {
    defaultMessage: "❌ Mappings or field values that don't comply with ECS are not supported",
  }
);

export const UNKNOWN = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.unknownCategoryLabel',
  {
    defaultMessage: 'Unknown',
  }
);
