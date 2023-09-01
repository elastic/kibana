/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEmpty } from 'lodash/fp';
import styled from 'styled-components';
import {
  EuiDescriptionList,
  EuiText,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiBadge,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type {
  Type,
  ThreatMapping as ThreatMappingType,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { FieldIcon } from '@kbn/react-field';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { FilterBadgeGroup } from '@kbn/unified-search-plugin/public';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema/rule_schemas';
import type { Threshold as ThresholdType } from '../../../../../common/api/detection_engine/model/rule_schema/specific_attributes/threshold_attributes';
import type { RequiredFieldArray } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes';
import { assertUnreachable } from '../../../../../common/utility_types';
import * as descriptionStepI18n from '../../../../detections/components/rules/description_step/translations';
import { RelatedIntegrationsDescription } from '../../../../detections/components/rules/related_integrations/integrations_description';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';
import * as threatMatchI18n from '../../../../common/components/threat_match/translations';
import * as timelinesI18n from '../../../../timelines/components/timeline/translations';
import { useRuleIndexPattern } from '../../../rule_creation_ui/pages/form';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import { convertHistoryStartToSize } from '../../../../detections/pages/detection_engine/rules/helpers';
import { MlJobLink } from '../../../../detections/components/rules/ml_job_link/ml_job_link';
import { useSecurityJobs } from '../../../../common/components/ml_popover/hooks/use_security_jobs';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { BadgeList } from './badge_list';
import { DESCRIPTION_LIST_COLUMN_WIDTHS } from './constants';
import * as i18n from './translations';

interface SavedQueryNameProps {
  savedQueryName: string;
}

const SavedQueryName = ({ savedQueryName }: SavedQueryNameProps) => (
  <EuiText size="s">{savedQueryName}</EuiText>
);

const EuiBadgeWrap = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
`;

interface FiltersProps {
  filters: Filter[];
  dataViewId?: string;
  index?: string[];
}

const Filters = ({ filters, dataViewId, index }: FiltersProps) => {
  const { indexPattern } = useRuleIndexPattern({
    dataSourceType: dataViewId ? DataSourceType.DataView : DataSourceType.IndexPatterns,
    index: index ?? [],
    dataViewId,
  });

  const flattenedFilters = mapAndFlattenFilters(filters);

  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {flattenedFilters.map((filter, idx) => (
        <EuiFlexItem grow={false} key={`filter-${idx}`} css={{ width: '100%' }}>
          <EuiBadgeWrap color="hollow">
            {indexPattern != null ? (
              <FilterBadgeGroup filters={[filter]} dataViews={[indexPattern]} />
            ) : (
              <EuiLoadingSpinner size="m" />
            )}
          </EuiBadgeWrap>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const QueryContent = styled.div`
  white-space: pre-wrap;
`;

interface QueryProps {
  query: string;
}

const Query = ({ query }: QueryProps) => <QueryContent>{query}</QueryContent>;

interface IndexProps {
  index: string[];
}

const Index = ({ index }: IndexProps) => <BadgeList badges={index} />;

interface DataViewIdProps {
  dataViewId: string;
}

const DataViewId = ({ dataViewId }: DataViewIdProps) => <EuiText size="s">{dataViewId}</EuiText>;

interface DataViewIndexPatternProps {
  dataViewId: string;
}

const DataViewIndexPattern = ({ dataViewId }: DataViewIndexPatternProps) => {
  const { data } = useKibana().services;
  const [indexPattern, setIndexPattern] = React.useState('');
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    data.dataViews
      .get(dataViewId)
      .then((dataView) => {
        setIndexPattern(dataView.getIndexPattern());
      })
      .catch(() => {
        setHasError(true);
      });
  }, [data, dataViewId]);

  if (hasError) {
    return <EuiText size="s">{i18n.DATA_VIEW_INDEX_PATTERN_FETCH_ERROR_MESSAGE}</EuiText>;
  }

  if (!indexPattern) {
    return <EuiLoadingSpinner size="m" />;
  }

  return <EuiText size="s">{indexPattern}</EuiText>;
};

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

interface AnomalyThresholdProps {
  anomalyThreshold: number;
}

const AnomalyThreshold = ({ anomalyThreshold }: AnomalyThresholdProps) => (
  <EuiText size="s">{anomalyThreshold}</EuiText>
);

interface MachineLearningJobListProps {
  jobIds: string[];
}

const MachineLearningJobList = ({ jobIds }: MachineLearningJobListProps) => {
  const { jobs } = useSecurityJobs();

  const relevantJobs = jobs.filter((job) => jobIds.includes(job.id));

  return (
    <>
      {relevantJobs.map((job) => (
        <MlJobLink
          key={job.id}
          jobId={job.id}
          jobName={job.customSettings?.security_app_display_name}
        />
      ))}
    </>
  );
};

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
      <EuiFlexItem grow={false} key={rF.name}>
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

interface NewTermsFieldsProps {
  newTermsFields: string[];
}

const NewTermsFields = ({ newTermsFields }: NewTermsFieldsProps) => (
  <BadgeList badges={newTermsFields} />
);

interface HistoryWindowSizeProps {
  historyWindowStart?: string;
}

const HistoryWindowSize = ({ historyWindowStart }: HistoryWindowSizeProps) => {
  const size = historyWindowStart ? convertHistoryStartToSize(historyWindowStart) : '7d';

  return <EuiText size="s">{size}</EuiText>;
};

// eslint-disable-next-line complexity
const prepareDefinitionSectionListItems = (
  rule: RuleResponse,
  savedQuery?: SavedQuery
): EuiDescriptionListProps['listItems'] => {
  const definitionSectionListItems: EuiDescriptionListProps['listItems'] = [];

  if ('index' in rule && rule.index && rule.index.length > 0) {
    definitionSectionListItems.push({
      title: i18n.INDEX_FIELD_LABEL,
      description: <Index index={rule.index} />,
    });
  }

  if ('data_view_id' in rule && rule.data_view_id) {
    definitionSectionListItems.push(
      {
        title: i18n.DATA_VIEW_ID_FIELD_LABEL,
        description: <DataViewId dataViewId={rule.data_view_id} />,
      },
      {
        title: i18n.DATA_VIEW_INDEX_PATTERN_FIELD_LABEL,
        description: <DataViewIndexPattern dataViewId={rule.data_view_id} />,
      }
    );
  }

  if (savedQuery) {
    definitionSectionListItems.push({
      title: descriptionStepI18n.SAVED_QUERY_NAME_LABEL,
      description: <SavedQueryName savedQueryName={savedQuery.attributes.title} />,
    });

    if (savedQuery.attributes.filters) {
      definitionSectionListItems.push({
        title: descriptionStepI18n.SAVED_QUERY_FILTERS_LABEL,
        description: <Filters filters={savedQuery.attributes.filters as Filter[]} />,
      });
    }
  }

  if ('filters' in rule && rule.filters && rule.filters.length > 0) {
    definitionSectionListItems.push({
      title: savedQuery
        ? descriptionStepI18n.SAVED_QUERY_FILTERS_LABEL
        : descriptionStepI18n.FILTERS_LABEL,
      description: (
        <Filters
          filters={rule.filters as Filter[]}
          dataViewId={rule.data_view_id}
          index={rule.index}
        />
      ),
    });
  }

  if ('query' in rule && rule.query) {
    definitionSectionListItems.push({
      title: savedQuery ? descriptionStepI18n.SAVED_QUERY_LABEL : descriptionStepI18n.QUERY_LABEL,
      description: <Query query={rule.query} />,
    });
  }

  definitionSectionListItems.push({
    title: i18n.RULE_TYPE_FIELD_LABEL,
    description: <RuleType type={rule.type} />,
  });

  if ('anomaly_threshold' in rule && rule.anomaly_threshold) {
    definitionSectionListItems.push({
      title: i18n.ANOMALY_THRESHOLD_FIELD_LABEL,
      description: <AnomalyThreshold anomalyThreshold={rule.anomaly_threshold} />,
    });
  }

  if ('machine_learning_job_id' in rule) {
    definitionSectionListItems.push({
      title: i18n.MACHINE_LEARNING_JOB_ID_FIELD_LABEL,
      description: <MachineLearningJobList jobIds={rule.machine_learning_job_id as string[]} />,
    });
  }

  if (rule.related_integrations.length > 0) {
    definitionSectionListItems.push({
      title: i18n.RELATED_INTEGRATIONS_FIELD_LABEL,
      description: (
        <RelatedIntegrationsDescription relatedIntegrations={rule.related_integrations} />
      ),
    });
  }

  if (rule.required_fields.length > 0) {
    definitionSectionListItems.push({
      title: i18n.REQUIRED_FIELDS_FIELD_LABEL,
      description: <RequiredFields requiredFields={rule.required_fields} />,
    });
  }

  definitionSectionListItems.push({
    title: i18n.TIMELINE_TITLE_FIELD_LABEL,
    description: (
      <TimelineTitle timelineTitle={rule.timeline_title || timelinesI18n.DEFAULT_TIMELINE_TITLE} />
    ),
  });

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

  if ('threat_filters' in rule && rule.threat_filters && rule.threat_filters.length > 0) {
    definitionSectionListItems.push({
      title: savedQuery
        ? descriptionStepI18n.SAVED_QUERY_FILTERS_LABEL
        : descriptionStepI18n.FILTERS_LABEL,
      description: (
        <Filters
          filters={rule.threat_filters as Filter[]}
          dataViewId={rule.data_view_id}
          index={rule.index}
        />
      ),
    });
  }

  if ('threat_query' in rule && rule.threat_query) {
    definitionSectionListItems.push({
      title: savedQuery
        ? descriptionStepI18n.SAVED_QUERY_LABEL
        : descriptionStepI18n.THREAT_QUERY_LABEL,
      description: <Query query={rule.threat_query} />,
    });
  }

  if ('new_terms_fields' in rule && rule.new_terms_fields && rule.new_terms_fields.length > 0) {
    definitionSectionListItems.push({
      title: i18n.NEW_TERMS_FIELDS_FIELD_LABEL,
      description: <NewTermsFields newTermsFields={rule.new_terms_fields} />,
    });
  }

  if (rule.type === 'new_terms' || 'history_window_start' in rule) {
    definitionSectionListItems.push({
      title: i18n.HISTORY_WINDOW_SIZE_FIELD_LABEL,
      description: <HistoryWindowSize historyWindowStart={rule.history_window_start} />,
    });
  }

  return definitionSectionListItems;
};

export interface RuleDefinitionSectionProps {
  rule: RuleResponse;
}

export const RuleDefinitionSection = ({ rule }: RuleDefinitionSectionProps) => {
  const { savedQuery } = useGetSavedQuery({
    savedQueryId: rule.type === 'saved_query' ? rule.saved_id : '',
    ruleType: rule.type,
  });

  const definitionSectionListItems = prepareDefinitionSectionListItems(rule, savedQuery);

  return (
    <div>
      <EuiDescriptionList
        type="column"
        listItems={definitionSectionListItems}
        columnWidths={DESCRIPTION_LIST_COLUMN_WIDTHS}
        rowGutterSize="m"
      />
    </div>
  );
};
