/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiIcon,
  EuiToolTip,
  EuiFlexGrid,
} from '@elastic/eui';
import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';

import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import type { ThreatMapping, Type, Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import { FilterBadgeGroup } from '@kbn/unified-search-plugin/public';
import { IntervalAbbrScreenReader } from '../../../../common/components/accessibility';
import type {
  RequiredFieldArray,
  Threshold,
  AlertSuppressionMissingFieldsStrategy,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { MATCHES, AND, OR } from '../../../../common/components/threat_match/translations';
import type { EqlOptionsSelected } from '../../../../../common/search_strategy';
import { assertUnreachable } from '../../../../../common/utility_types';
import * as i18nSeverity from '../severity_mapping/translations';
import * as i18nRiskScore from '../risk_score_mapping/translations';

import * as i18n from './translations';
import type { BuildQueryBarDescription, ListItems } from './types';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import type {
  AboutStepRiskScore,
  AboutStepSeverity,
  Duration,
} from '../../../../detections/pages/detection_engine/rules/types';
import { GroupByOptions } from '../../../../detections/pages/detection_engine/rules/types';
import { defaultToEmptyTag } from '../../../../common/components/empty_value';
import { RequiredFieldIcon } from '../../../rule_management/components/rule_details/required_field_icon';
import { ThreatEuiFlexGroup } from './threat_description';
import { AlertSuppressionLabel } from './alert_suppression_label';

const NoteDescriptionContainer = styled(EuiFlexItem)`
  height: 105px;
  overflow-y: hidden;
`;

const SetupDescriptionContainer = styled(EuiFlexItem)`
  height: 105px;
  overflow-y: hidden;
`;

export const isNotEmptyArray = (values: string[]) => !isEmpty(values.join(''));

const EuiBadgeWrap = styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
` as unknown as typeof EuiBadge;

const Query = styled.div`
  white-space: pre-wrap;
`;

export const getQueryLabel = (ruleType: Type | undefined): string => {
  switch (ruleType) {
    case 'eql':
      return i18n.EQL_QUERY_LABEL;
    case 'saved_query':
      return i18n.SAVED_QUERY_LABEL;
    case 'esql':
      return i18n.ESQL_QUERY_LABEL;
    default:
      return i18n.QUERY_LABEL;
  }
};

export const buildQueryBarDescription = ({
  field,
  filters,
  filterManager,
  query,
  savedId,
  savedQueryName,
  indexPatterns,
  queryLabel,
}: BuildQueryBarDescription): ListItems[] => {
  let items: ListItems[] = [];
  const isLoadedFromSavedQuery = !isEmpty(savedId) && !isEmpty(savedQueryName);
  if (isLoadedFromSavedQuery) {
    items = [
      ...items,
      {
        title: <>{i18n.SAVED_QUERY_NAME_LABEL} </>,
        description: <>{savedQueryName} </>,
      },
    ];
  }

  if (!isEmpty(filters)) {
    filterManager.setFilters(filters);
    items = [
      ...items,
      {
        title: <>{isLoadedFromSavedQuery ? i18n.SAVED_QUERY_FILTERS_LABEL : i18n.FILTERS_LABEL} </>,
        description: (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            {filterManager.getFilters().map((filter, index) => (
              <EuiFlexItem grow={false} key={`${field}-filter-${index}`} css={{ width: '100%' }}>
                <EuiBadgeWrap color="hollow">
                  {indexPatterns != null ? (
                    <FilterBadgeGroup filters={[filter]} dataViews={[indexPatterns]} />
                  ) : (
                    <EuiLoadingSpinner size="m" />
                  )}
                </EuiBadgeWrap>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ),
      },
    ];
  }
  if (!isEmpty(query)) {
    items = [
      ...items,
      {
        title: (
          <>{isLoadedFromSavedQuery ? i18n.SAVED_QUERY_LABEL : queryLabel ?? i18n.QUERY_LABEL}</>
        ),
        description: <Query>{query}</Query>,
      },
    ];
  }

  return items;
};

export const buildEqlOptionsDescription = (eqlOptions: EqlOptionsSelected): ListItems[] => {
  let items: ListItems[] = [];
  if (!isEmpty(eqlOptions.eventCategoryField)) {
    items = [
      ...items,
      {
        title: <>{i18n.EQL_EVENT_CATEGORY_FIELD_LABEL}</>,
        description: <>{eqlOptions.eventCategoryField}</>,
      },
    ];
  }
  if (!isEmpty(eqlOptions.tiebreakerField)) {
    items = [
      ...items,
      {
        title: <>{i18n.EQL_TIEBREAKER_FIELD_LABEL}</>,
        description: <>{eqlOptions.tiebreakerField}</>,
      },
    ];
  }
  if (!isEmpty(eqlOptions.timestampField)) {
    items = [
      ...items,
      {
        title: <>{i18n.EQL_TIMESTAMP_FIELD_LABEL}</>,
        description: <>{eqlOptions.timestampField}</>,
      },
    ];
  }
  return items;
};

interface BuildThreatDescriptionProps {
  label: string;
  threat: Threats;
}

export const buildThreatDescription = ({
  threat,
  label,
}: BuildThreatDescriptionProps): ListItems[] => {
  if (threat.length > 0) {
    return [
      {
        title: label,
        description: <ThreatEuiFlexGroup threat={threat} />,
      },
    ];
  }
  return [];
};

export const buildUnorderedListArrayDescription = (
  label: string,
  field: string,
  values: string[]
): ListItems[] => {
  if (isNotEmptyArray(values)) {
    return [
      {
        title: label,
        description: (
          <EuiText size="s">
            <ul>
              {values.map((val) =>
                isEmpty(val) ? null : (
                  <li data-test-subj="unorderedListArrayDescriptionItem" key={`${field}-${val}`}>
                    {val}
                  </li>
                )
              )}
            </ul>
          </EuiText>
        ),
      },
    ];
  }
  return [];
};

export const buildHighlightedFieldsOverrideDescription = (
  label: string,
  values: string[]
): ListItems[] => {
  if (isEmpty(values)) {
    return [];
  }
  const description = (
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {values.map((val: string) =>
        isEmpty(val) ? null : (
          <EuiFlexItem grow={false} key={`${label}-${val}`}>
            <EuiBadgeWrap
              data-test-subj="customHighlightedFieldsStringArrayDescriptionBadgeItem"
              color="hollow"
            >
              {val}
            </EuiBadgeWrap>
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );

  return [
    {
      title: label,
      description,
    },
  ];
};

export const buildStringArrayDescription = (
  label: string,
  field: string,
  values: string[]
): ListItems[] => {
  if (isNotEmptyArray(values)) {
    return [
      {
        title: label,
        description: (
          <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
            {values.map((val: string) =>
              isEmpty(val) ? null : (
                <EuiFlexItem grow={false} key={`${field}-${val}`}>
                  <EuiBadgeWrap data-test-subj="stringArrayDescriptionBadgeItem" color="hollow">
                    {val}
                  </EuiBadgeWrap>
                </EuiFlexItem>
              )
            )}
          </EuiFlexGroup>
        ),
      },
    ];
  }
  return [];
};

const OverrideColumn = styled(EuiFlexItem)`
  width: 125px;
  max-width: 125px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OverrideValueColumn = styled(EuiFlexItem)`
  width: 30px;
  max-width: 30px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const buildSeverityDescription = (severity: AboutStepSeverity): ListItems[] => [
  {
    title: i18nSeverity.DEFAULT_SEVERITY,
    description: <SeverityBadge value={severity.value} />,
  },
  ...(severity.isMappingChecked
    ? severity.mapping
        .filter((severityItem) => severityItem.field !== '')
        .map((severityItem, index) => {
          return {
            title: index === 0 ? i18nSeverity.SEVERITY_MAPPING : '',
            description: (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <OverrideColumn>
                  <EuiToolTip
                    content={severityItem.field}
                    data-test-subj={`severityOverrideField${index}`}
                  >
                    <>{`${severityItem.field}:`}</>
                  </EuiToolTip>
                </OverrideColumn>
                <OverrideValueColumn>
                  <EuiToolTip
                    content={severityItem.value}
                    data-test-subj={`severityOverrideValue${index}`}
                  >
                    {defaultToEmptyTag(severityItem.value)}
                  </EuiToolTip>
                </OverrideValueColumn>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={'sortRight'} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <SeverityBadge
                    data-test-subj={`severityOverrideSeverity${index}`}
                    value={severityItem.severity}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          };
        })
    : []),
];

export const buildRiskScoreDescription = (riskScore: AboutStepRiskScore): ListItems[] => [
  {
    title: i18nRiskScore.RISK_SCORE,
    description: riskScore.value,
  },
  ...(riskScore.isMappingChecked
    ? riskScore.mapping
        .filter((riskScoreItem) => riskScoreItem.field !== '')
        .map((riskScoreItem, index) => {
          return {
            title: index === 0 ? i18nRiskScore.RISK_SCORE_MAPPING : '',
            description: (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <OverrideColumn>
                  <EuiToolTip
                    content={riskScoreItem.field}
                    data-test-subj={`riskScoreOverrideField${index}`}
                  >
                    <>{riskScoreItem.field}</>
                  </EuiToolTip>
                </OverrideColumn>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={'sortRight'} />
                </EuiFlexItem>
                <EuiFlexItem>{ALERT_RISK_SCORE}</EuiFlexItem>
              </EuiFlexGroup>
            ),
          };
        })
    : []),
];

const MyRefUrlLink = styled(EuiLink)`
  word-break: break-word;
`;

export const buildUrlsDescription = (label: string, values: string[]): ListItems[] => {
  if (isNotEmptyArray(values)) {
    return [
      {
        title: label,
        description: (
          <EuiText size="s">
            <ul>
              {values
                .filter((v) => !isEmpty(v))
                .map((val, index) => (
                  <li data-test-subj="urlsDescriptionReferenceLinkItem" key={`${index}-${val}`}>
                    <MyRefUrlLink href={val} external target="_blank">
                      {val}
                    </MyRefUrlLink>
                  </li>
                ))}
            </ul>
          </EuiText>
        ),
      },
    ];
  }
  return [];
};

export const buildNoteDescription = (label: string, note: string): ListItems[] => {
  if (note.trim() !== '') {
    return [
      {
        title: label,
        description: (
          <NoteDescriptionContainer>
            <div data-test-subj="noteDescriptionItem" className="eui-yScrollWithShadows">
              {note}
            </div>
          </NoteDescriptionContainer>
        ),
      },
    ];
  }
  return [];
};

export const buildRuleTypeDescription = (label: string, ruleType: Type): ListItems[] => {
  switch (ruleType) {
    case 'machine_learning': {
      return [
        {
          title: label,
          description: i18n.ML_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'query':
    case 'saved_query': {
      return [
        {
          title: label,
          description: i18n.QUERY_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'threshold': {
      return [
        {
          title: label,
          description: i18n.THRESHOLD_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'eql': {
      return [
        {
          title: label,
          description: i18n.EQL_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'threat_match': {
      return [
        {
          title: label,
          description: i18n.THREAT_MATCH_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'new_terms': {
      return [
        {
          title: label,
          description: i18n.NEW_TERMS_TYPE_DESCRIPTION,
        },
      ];
    }
    case 'esql': {
      return [
        {
          title: label,
          description: i18n.ESQL_TYPE_DESCRIPTION,
        },
      ];
    }
    default:
      return assertUnreachable(ruleType);
  }
};

export const buildThresholdDescription = (label: string, threshold: Threshold): ListItems[] => [
  {
    title: label,
    description: (
      <>
        {isEmpty(threshold.field[0])
          ? `${i18n.THRESHOLD_RESULTS_ALL} >= ${threshold.value}`
          : `${i18n.THRESHOLD_RESULTS_AGGREGATED_BY} ${
              Array.isArray(threshold.field) ? threshold.field.join(',') : threshold.field
            } >= ${threshold.value}`}
      </>
    ),
  },
];

export const buildThreatMappingDescription = (
  title: string,
  threatMapping: ThreatMapping
): ListItems[] => {
  const description = threatMapping.reduce<string>(
    (accumThreatMaps, threatMap, threatMapIndex, { length: threatMappingLength }) => {
      const matches = threatMap.entries.reduce<string>(
        (accumItems, item, itemsIndex, { length: threatMapLength }) => {
          if (threatMapLength === 1) {
            return `${item.field} ${MATCHES} ${item.value}`;
          } else if (itemsIndex === 0) {
            return `(${item.field} ${MATCHES} ${item.value})`;
          } else {
            return `${accumItems} ${AND} (${item.field} ${MATCHES} ${item.value})`;
          }
        },
        ''
      );

      if (threatMappingLength === 1) {
        return `${matches}`;
      } else if (threatMapIndex === 0) {
        return `(${matches})`;
      } else {
        return `${accumThreatMaps} ${OR} (${matches})`;
      }
    },
    ''
  );
  return [
    {
      title,
      description,
    },
  ];
};

const FieldTypeText = styled(EuiText)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  display: inline;
`;

export const buildRequiredFieldsDescription = (
  label: string,
  requiredFields: RequiredFieldArray
): ListItems[] => {
  if (isEmpty(requiredFields)) {
    return [];
  }

  return [
    {
      title: label,
      description: (
        <EuiFlexGrid gutterSize={'s'}>
          {requiredFields.map((rF, index) => (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
                <EuiFlexItem grow={false}>
                  <RequiredFieldIcon data-test-subj="field-type-icon" type={rF.type} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FieldTypeText grow={false} size={'s'}>
                    {` ${rF.name}${index + 1 !== requiredFields.length ? ', ' : ''}`}
                  </FieldTypeText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      ),
    },
  ];
};

export const buildAlertSuppressionDescription = (
  label: string = i18n.GROUP_BY_LABEL,
  values: string[],
  ruleType: Type
): ListItems[] => {
  if (isEmpty(values)) {
    return [];
  }
  const description = (
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {values.map((val: string) =>
        isEmpty(val) ? null : (
          <EuiFlexItem grow={false} key={`${label}-${val}`}>
            <EuiBadgeWrap data-test-subj="stringArrayDescriptionBadgeItem" color="hollow">
              {val}
            </EuiBadgeWrap>
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );

  const title = <AlertSuppressionLabel label={label} ruleType={ruleType} />;
  return [
    {
      title,
      description,
    },
  ];
};

export const buildAlertSuppressionWindowDescription = (
  label: string,
  value: Duration,
  groupByRadioSelection: GroupByOptions,
  ruleType: Type
): ListItems[] => {
  const description =
    groupByRadioSelection === GroupByOptions.PerTimePeriod
      ? `${value.value}${value.unit}`
      : i18n.ALERT_SUPPRESSION_PER_RULE_EXECUTION;

  const title = <AlertSuppressionLabel label={label} ruleType={ruleType} />;
  return [
    {
      title,
      description,
    },
  ];
};

export const buildAlertSuppressionMissingFieldsDescription = (
  label: string,
  value: AlertSuppressionMissingFieldsStrategy,
  ruleType: Type
): ListItems[] => {
  if (isEmpty(value)) {
    return [];
  }

  const description =
    value === AlertSuppressionMissingFieldsStrategyEnum.suppress
      ? i18n.ALERT_SUPPRESSION_SUPPRESS_ON_MISSING_FIELDS
      : i18n.ALERT_SUPPRESSION_DO_NOT_SUPPRESS_ON_MISSING_FIELDS;

  const title = <AlertSuppressionLabel label={label} ruleType={ruleType} />;
  return [
    {
      title,
      description,
    },
  ];
};

export const buildSetupDescription = (label: string, setup: string): ListItems[] => {
  if (setup.trim() !== '') {
    return [
      {
        title: label,
        description: (
          <SetupDescriptionContainer>
            <div data-test-subj="setupDescriptionItem" className="eui-yScrollWithShadows">
              {setup}
            </div>
          </SetupDescriptionContainer>
        ),
      },
    ];
  }
  return [];
};

export const buildIntervalDescription = (label: string, value: string): ListItems[] => {
  return [
    {
      title: label,
      description: <IntervalAbbrScreenReader interval={value} />,
    },
  ];
};
