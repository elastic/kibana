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

export const ALL_CALLOUT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.allCallout',
  {
    defaultMessage:
      'All mappings for the fields in this index, which includes fields defined by the Elastic Common Schema (ECS), and fields that are not',
  }
);

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
    defaultMessage: 'Data quality case',
  }
);

export const CASE_SUMMARY_MARKDOWN_DESCRIPTION = ({
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
  i18n.translate(
    'xpack.securitySolution.dataQuality.indexProperties.caseSummaryMarkdownDescription',
    {
      values: { ecsFieldReferenceUrl, ecsReferenceUrl, indexName, updateMappingUrl, version },
      defaultMessage:
        'This case contains recommendations for [updating field mappings]({updateMappingUrl}) in the `{indexName}` index, because they are different than the [Elastic Common Schema]({ecsReferenceUrl}) (ECS) version `{version}` [definitions]({ecsFieldReferenceUrl}).',
    }
  );

export const CUSTOM_DETECTION_ENGINE_RULES_WORK = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.custonDetectionEngineRulesWorkMessage',
  {
    defaultMessage: '✅ Custom detection engine rules work',
  }
);

export const ECS_COMPLIANT = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.ecsCompliantTab',
  {
    defaultMessage: 'ECS compliant',
  }
);

export const ECS_COMPLIANT_CALLOUT = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.ecsCompliantCallout', {
    values: { fieldCount },
    defaultMessage:
      'The {fieldCount, plural, =1 {type for this field matches} other {types for these fields match}} the Elastic Common Schema (ECS)',
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
    defaultMessage: '✅ ECS compliant mappings are fully supported',
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

export const NON_ECS_CALLOUT = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.nonEcsCallout', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount, plural, =1 {This field is not} other {These fields are not}} defined by the Elastic Common Schema (ECS). An index may contain non ECS fields, however:',
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

export const NOT_ECS_COMPLIANT_CALLOUT = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantCallout', {
    values: { fieldCount },
    defaultMessage:
      'Consider updating the {fieldCount, plural, =1 {mapping} other {mappings}} for {fieldCount, plural, =1 {this field} other {these fields}} to match {fieldCount, plural, =1 {its Elastic Common Schema (ECS) type} other {their Elastic Common Schema (ECS) types}}, because:',
  });

export const NOT_ECS_COMPLIANT_CALLOUT_TITLE = (fieldCount: number) =>
  i18n.translate('xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantCalloutTitle', {
    values: { fieldCount },
    defaultMessage:
      '{fieldCount} Not ECS compliant {fieldCount, plural, =1 {field mapping} other {field mappings}}',
  });

export const NOT_ECS_COMPLIANT_EMPTY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantEmptyContent',
  {
    defaultMessage:
      'All of the field mappings in this index have types that match the Elastic Common Schema (ECS) types',
  }
);

export const NOT_ECS_COMPLIANT_EMPTY_TITLE = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.notEcsCompliantEmptyTitle',
  {
    defaultMessage: 'All field mappings are ECS compliant',
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
    defaultMessage: "❌ Detection engine rules won't work",
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
    defaultMessage: '✅ Pages display events',
  }
);

export const PAGES_MAY_NOT_DISPLAY_EVENTS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.pagesMayNotDisplayEventsMessage',
  {
    defaultMessage: '⚠️ Pages may not display events',
  }
);

export const PAGES_WONT_DISPLAY_EVENTS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.pagesWontDisplayEventsMessage',
  {
    defaultMessage: '❌ Pages wont display events',
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
    defaultMessage: "❌ Pre-built detection engine rules won't work",
  }
);

export const TIMELINE_AND_TEMPLATES_MAY_NOT_OPERATE_PROPERLY = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.timelineAndTemplatesMayNotOperateProperlyMessage',
  {
    defaultMessage: '⚠️ Timeline and templates may not operate properly',
  }
);

export const MAPPINGS_THAT_CONFLICT_WITH_ECS = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.mappingThatConflictWithEcsMessage',
  {
    defaultMessage: '❌ Mappings that conflict with ECS are not supported',
  }
);

export const UNKNOWN = i18n.translate(
  'xpack.securitySolution.dataQuality.indexProperties.unknownCategoryLabel',
  {
    defaultMessage: 'Unknown',
  }
);
