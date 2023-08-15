/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';
import { EuiDescriptionList, EuiText, EuiFlexGrid, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type {
  Type,
  ThreatMapping as ThreatMappingType,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { FieldIcon } from '@kbn/react-field';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import type { Threshold as ThresholdType } from '../../../../../common/api/detection_engine/model/rule_schema/specific_attributes/threshold_attributes';
import type { RequiredFieldArray } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes';
import { assertUnreachable } from '../../../../../common/utility_types';
import * as descriptionStepI18n from '../../../../detections/components/rules/description_step/translations';
import { MlJobsDescription } from '../../../../detections/components/rules/ml_jobs_description/ml_jobs_description';
import { RelatedIntegrationsDescription } from '../../../../detections/components/rules/related_integrations/integrations_description';
import * as threatMatchI18n from '../../../../common/components/threat_match/translations';
import { BadgeList } from './badge_list';
import * as i18n from './translations';

interface IndexProps {
  index: string[];
}

const Index = ({ index }: IndexProps) => <BadgeList badges={index} />;

interface DataViewProps {
  dataViewId: string;
}

const DataView = ({ dataViewId }: DataViewProps) => <EuiText size="s">{dataViewId}</EuiText>;

interface ThresholdProps {
  threshold: ThresholdType;
}

const Threshold = ({ threshold }: ThresholdProps) => (
  <>
    {isEmpty(threshold.field[0])
      ? `${descriptionStepI18n.THRESHOLD_RESULTS_ALL} >= ${threshold.value}`
      : `${descriptionStepI18n.THRESHOLD_RESULTS_AGGREGATED_BY} ${
          Array.isArray(threshold.field) ? threshold.field.join(',') : threshold.field
        } >= ${threshold.value}`}
  </>
);

const getRuleTypeDescription = (ruleType: Type) => {
  switch (ruleType) {
    case 'machine_learning':
      return descriptionStepI18n.ML_TYPE_DESCRIPTION;
    case 'query':
    case 'saved_query':
      return descriptionStepI18n.QUERY_TYPE_DESCRIPTION;
    case 'threshold':
      return descriptionStepI18n.THRESHOLD_TYPE_DESCRIPTION;
    case 'eql':
      return descriptionStepI18n.EQL_TYPE_DESCRIPTION;
    case 'threat_match':
      return descriptionStepI18n.THREAT_MATCH_TYPE_DESCRIPTION;
    case 'new_terms':
      return descriptionStepI18n.NEW_TERMS_TYPE_DESCRIPTION;
    default:
      return assertUnreachable(ruleType);
  }
};

interface RuleTypeProps {
  type: Type;
}

const RuleType = ({ type }: RuleTypeProps) => (
  <EuiText size="s">{getRuleTypeDescription(type)}</EuiText>
);

const StyledFieldTypeText = styled(EuiText)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  display: inline;
`;

interface RequiredFieldsProps {
  requiredFields: RequiredFieldArray;
}

const RequiredFields = ({ requiredFields }: RequiredFieldsProps) => (
  <EuiFlexGrid gutterSize={'s'}>
    {requiredFields.map((rF, index) => (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
          <EuiFlexItem grow={false}>
            <FieldIcon
              data-test-subj="field-type-icon"
              type={castEsToKbnFieldTypeName(rF.type)}
              label={rF.type}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StyledFieldTypeText grow={false} size={'s'}>
              {` ${rF.name}${index + 1 !== requiredFields.length ? ', ' : ''}`}
            </StyledFieldTypeText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

interface TimelineTitleProps {
  timelineTitle: string;
}

const TimelineTitle = ({ timelineTitle }: TimelineTitleProps) => (
  <EuiText size="s">{timelineTitle}</EuiText>
);

interface ThreatIndexProps {
  threatIndex: string[];
}

const ThreatIndex = ({ threatIndex }: ThreatIndexProps) => <BadgeList badges={threatIndex} />;

interface ThreatMappingProps {
  threatMapping: ThreatMappingType;
}

const ThreatMapping = ({ threatMapping }: ThreatMappingProps) => {
  const description = threatMapping.reduce<string>(
    (accumThreatMaps, threatMap, threatMapIndex, { length: threatMappingLength }) => {
      const matches = threatMap.entries.reduce<string>(
        (accumItems, item, itemsIndex, { length: threatMapLength }) => {
          if (threatMapLength === 1) {
            return `${item.field} ${threatMatchI18n.MATCHES} ${item.value}`;
          } else if (itemsIndex === 0) {
            return `(${item.field} ${threatMatchI18n.MATCHES} ${item.value})`;
          } else {
            return `${accumItems} ${threatMatchI18n.AND} (${item.field} ${threatMatchI18n.MATCHES} ${item.value})`;
          }
        },
        ''
      );

      if (threatMappingLength === 1) {
        return `${matches}`;
      } else if (threatMapIndex === 0) {
        return `(${matches})`;
      } else {
        return `${accumThreatMaps} ${threatMatchI18n.OR} (${matches})`;
      }
    },
    ''
  );

  return <EuiText size="s">{description}</EuiText>;
};

const prepareDefinitionSectionListItems = (
  rule: Partial<RuleResponse>
): EuiDescriptionListProps['listItems'] => {
  const definitionSectionListItems: EuiDescriptionListProps['listItems'] = [];

  if ('index' in rule && rule.index && rule.index.length > 0) {
    definitionSectionListItems.push({
      title: i18n.INDEX_FIELD_LABEL,
      description: <Index index={rule.index} />,
    });
  }

  if ('data_view_id' in rule && rule.data_view_id) {
    definitionSectionListItems.push({
      title: i18n.DATA_VIEW_FIELD_LABEL,
      description: <DataView dataViewId={rule.data_view_id} />,
    });
  }

  if (rule.type) {
    definitionSectionListItems.push({
      title: i18n.RULE_TYPE_FIELD_LABEL,
      description: <RuleType type={rule.type} />,
    });
  }

  if ('machine_learning_job_id' in rule) {
    definitionSectionListItems.push({
      title: i18n.MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
      description: <MlJobsDescription jobIds={rule.machine_learning_job_id as string[]} />,
    });
  }

  if (rule.related_integrations && rule.related_integrations.length > 0) {
    definitionSectionListItems.push({
      title: i18n.RELATED_INTEGRATIONS_FIELD_LABEL,
      description: (
        <RelatedIntegrationsDescription relatedIntegrations={rule.related_integrations} />
      ),
    });
  }

  if (rule.required_fields && rule.required_fields.length > 0) {
    definitionSectionListItems.push({
      title: i18n.REQUIRED_FIELDS_FIELD_LABEL,
      description: <RequiredFields requiredFields={rule.required_fields} />,
    });
  }

  if (rule.timeline_title) {
    definitionSectionListItems.push({
      title: i18n.TIMELINE_TITLE_FIELD_LABEL,
      description: <TimelineTitle timelineTitle={rule.timeline_title} />,
    });
  }

  if ('threshold' in rule && rule.threshold) {
    definitionSectionListItems.push({
      title: i18n.THRESHOLD_FIELD_LABEL,
      description: <Threshold threshold={rule.threshold} />,
    });
  }

  if ('threat_index' in rule && rule.threat_index) {
    definitionSectionListItems.push({
      title: i18n.THREAT_INDEX_FIELD_LABEL,
      description: <ThreatIndex threatIndex={rule.threat_index} />,
    });
  }

  if ('threat_mapping' in rule && rule.threat_mapping) {
    definitionSectionListItems.push({
      title: i18n.THREAT_MAPPING_FIELD_LABEL,
      description: <ThreatMapping threatMapping={rule.threat_mapping} />,
    });
  }

  return definitionSectionListItems;
};

export interface RuleDefinitionSectionProps {
  rule: Partial<RuleResponse>;
}

export const RuleDefinitionSection = ({ rule }: RuleDefinitionSectionProps) => {
  const definitionSectionListItems = prepareDefinitionSectionListItems(rule);

  return (
    <div>
      <EuiDescriptionList type="column" listItems={definitionSectionListItems} />
    </div>
  );
};
