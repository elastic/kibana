/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiLink,
  EuiText,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

import { isEmpty } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import * as i18nSeverity from '../severity_mapping/translations';
import * as i18nRiskScore from '../risk_score_mapping/translations';
import { Threshold } from '../../../../../common/detection_engine/schemas/common/schemas';
import { RuleType } from '../../../../../common/detection_engine/types';
import { esFilters } from '../../../../../../../../src/plugins/data/public';

import { tacticsOptions, techniquesOptions } from '../../../mitre/mitre_tactics_techniques';

import * as i18n from './translations';
import { BuildQueryBarDescription, BuildThreatDescription, ListItems } from './types';
import { SeverityBadge } from '../severity_badge';
import ListTreeIcon from './assets/list_tree_icon.svg';
import { assertUnreachable } from '../../../../common/lib/helpers';
import { AboutStepRiskScore, AboutStepSeverity } from '../../../pages/detection_engine/rules/types';

const NoteDescriptionContainer = styled(EuiFlexItem)`
  height: 105px;
  overflow-y: hidden;
`;

export const isNotEmptyArray = (values: string[]) => !isEmpty(values.join(''));

const EuiBadgeWrap = (styled(EuiBadge)`
  .euiBadge__text {
    white-space: pre-wrap !important;
  }
` as unknown) as typeof EuiBadge;

export const buildQueryBarDescription = ({
  field,
  filters,
  filterManager,
  query,
  savedId,
  indexPatterns,
}: BuildQueryBarDescription): ListItems[] => {
  let items: ListItems[] = [];
  if (!isEmpty(filters)) {
    filterManager.setFilters(filters);
    items = [
      ...items,
      {
        title: <>{i18n.FILTERS_LABEL} </>,
        description: (
          <EuiFlexGroup wrap responsive={false} gutterSize="xs">
            {filterManager.getFilters().map((filter, index) => (
              <EuiFlexItem grow={false} key={`${field}-filter-${index}`}>
                <EuiBadgeWrap color="hollow">
                  {indexPatterns != null ? (
                    <esFilters.FilterLabel
                      filter={filter}
                      valueLabel={esFilters.getDisplayValueFromFilter(filter, [indexPatterns])}
                    />
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
        title: <>{i18n.QUERY_LABEL} </>,
        description: <>{query} </>,
      },
    ];
  }
  if (!isEmpty(savedId)) {
    items = [
      ...items,
      {
        title: <>{i18n.SAVED_ID_LABEL} </>,
        description: <>{savedId} </>,
      },
    ];
  }
  return items;
};

const ThreatEuiFlexGroup = styled(EuiFlexGroup)`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

const TechniqueLinkItem = styled(EuiButtonEmpty)`
  .euiIcon {
    width: 8px;
    height: 8px;
  }
`;

export const buildThreatDescription = ({ label, threat }: BuildThreatDescription): ListItems[] => {
  if (threat.length > 0) {
    return [
      {
        title: label,
        description: (
          <ThreatEuiFlexGroup direction="column">
            {threat.map((singleThreat, index) => {
              const tactic = tacticsOptions.find((t) => t.id === singleThreat.tactic.id);
              return (
                <EuiFlexItem key={`${singleThreat.tactic.name}-${index}`}>
                  <EuiLink
                    data-test-subj="threatTacticLink"
                    href={singleThreat.tactic.reference}
                    target="_blank"
                  >
                    {tactic != null ? tactic.text : ''}
                  </EuiLink>
                  <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                    {singleThreat.technique.map((technique, listIndex) => {
                      const myTechnique = techniquesOptions.find((t) => t.id === technique.id);
                      return (
                        <EuiFlexItem key={myTechnique?.id ?? listIndex}>
                          <TechniqueLinkItem
                            data-test-subj="threatTechniqueLink"
                            href={technique.reference}
                            target="_blank"
                            iconType={ListTreeIcon}
                            size="xs"
                            flush="left"
                          >
                            {myTechnique != null ? myTechnique.label : ''}
                          </TechniqueLinkItem>
                        </EuiFlexItem>
                      );
                    })}
                  </EuiFlexGroup>
                </EuiFlexItem>
              );
            })}
            <EuiSpacer />
          </ThreatEuiFlexGroup>
        ),
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

export const buildSeverityDescription = (severity: AboutStepSeverity): ListItems[] => [
  {
    title: i18nSeverity.DEFAULT_SEVERITY,
    description: <SeverityBadge value={severity.value} />,
  },
  ...severity.mapping.map((severityItem, index) => {
    return {
      title: index === 0 ? i18nSeverity.SEVERITY_MAPPING : '',
      description: (
        <EuiFlexGroup alignItems="center">
          <OverrideColumn>
            <EuiToolTip
              content={severityItem.field}
              data-test-subj={`severityOverrideField${index}`}
            >
              <>{severityItem.field}</>
            </EuiToolTip>
          </OverrideColumn>
          <EuiToolTip content={severityItem.value} data-test-subj={`severityOverrideValue${index}`}>
            <>{severityItem.value}</>
          </EuiToolTip>
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
  }),
];

export const buildRiskScoreDescription = (riskScore: AboutStepRiskScore): ListItems[] => [
  {
    title: i18nRiskScore.RISK_SCORE,
    description: riskScore.value,
  },
  ...riskScore.mapping.map((riskScoreItem, index) => {
    return {
      title: index === 0 ? i18nRiskScore.RISK_SCORE_MAPPING : '',
      description: (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiToolTip
              content={riskScoreItem.field}
              data-test-subj={`riskScoreOverrideField${index}`}
            >
              <>{riskScoreItem.field}</>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type={'sortRight'} />
          </EuiFlexItem>
          <EuiFlexItem>{'signal.rule.risk_score'}</EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  }),
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

export const buildRuleTypeDescription = (label: string, ruleType: RuleType): ListItems[] => {
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
          : `${i18n.THRESHOLD_RESULTS_AGGREGATED_BY} ${threshold.field[0]} >= ${threshold.value}`}
      </>
    ),
  },
];
