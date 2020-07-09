/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, chunk, get, pick, isNumber } from 'lodash/fp';
import React, { memo, useState } from 'react';
import styled from 'styled-components';

import { RuleType } from '../../../../../common/detection_engine/types';
import {
  IIndexPattern,
  Filter,
  esFilters,
  FilterManager,
} from '../../../../../../../../src/plugins/data/public';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { useKibana } from '../../../../common/lib/kibana';
import {
  AboutStepRiskScore,
  AboutStepSeverity,
  IMitreEnterpriseAttack,
} from '../../../pages/detection_engine/rules/types';
import { FieldValueTimeline } from '../pick_timeline';
import { FormSchema } from '../../../../shared_imports';
import { ListItems } from './types';
import {
  buildQueryBarDescription,
  buildSeverityDescription,
  buildStringArrayDescription,
  buildThreatDescription,
  buildUnorderedListArrayDescription,
  buildUrlsDescription,
  buildNoteDescription,
  buildRuleTypeDescription,
} from './helpers';
import { useSiemJobs } from '../../../../common/components/ml_popover/hooks/use_siem_jobs';
import { buildMlJobDescription } from './ml_job_description';
import { buildActionsDescription } from './actions_description';
import { buildThrottleDescription } from './throttle_description';

const DescriptionListContainer = styled(EuiDescriptionList)`
  &.euiDescriptionList--column .euiDescriptionList__title {
    width: 30%;
  }
  &.euiDescriptionList--column .euiDescriptionList__description {
    width: 70%;
  }
`;

interface StepRuleDescriptionProps {
  columns?: 'multi' | 'single' | 'singleSplit';
  data: unknown;
  indexPatterns?: IIndexPattern;
  schema: FormSchema;
}

export const StepRuleDescriptionComponent: React.FC<StepRuleDescriptionProps> = ({
  data,
  columns = 'multi',
  indexPatterns,
  schema,
}) => {
  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));
  const [, siemJobs] = useSiemJobs(true);

  const keys = Object.keys(schema);
  const listItems = keys.reduce((acc: ListItems[], key: string) => {
    if (key === 'machineLearningJobId') {
      return [
        ...acc,
        buildMlJobDescription(
          get(key, data) as string,
          (get(key, schema) as { label: string }).label,
          siemJobs
        ),
      ];
    }

    if (key === 'throttle') {
      return [...acc, buildThrottleDescription(get(key, data), get([key, 'label'], schema))];
    }

    if (key === 'actions') {
      return [...acc, buildActionsDescription(get(key, data), get([key, 'label'], schema))];
    }

    return [...acc, ...buildListItems(data, pick(key, schema), filterManager, indexPatterns)];
  }, []);

  if (columns === 'multi') {
    return (
      <EuiFlexGroup>
        {chunk(Math.ceil(listItems.length / 2), listItems).map((chunkListItems, index) => (
          <EuiFlexItem
            data-test-subj="listItemColumnStepRuleDescription"
            key={`description-step-rule-${index}`}
          >
            <EuiDescriptionList listItems={chunkListItems} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem data-test-subj="listItemColumnStepRuleDescription">
        {columns === 'single' ? (
          <EuiDescriptionList listItems={listItems} />
        ) : (
          <DescriptionListContainer
            data-test-subj="singleSplitStepRuleDescriptionList"
            type="column"
            listItems={listItems}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const StepRuleDescription = memo(StepRuleDescriptionComponent);

export const buildListItems = (
  data: unknown,
  schema: FormSchema,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] =>
  Object.keys(schema).reduce<ListItems[]>(
    (acc, field) => [
      ...acc,
      ...getDescriptionItem(
        field,
        get([field, 'label'], schema),
        data,
        filterManager,
        indexPatterns
      ),
    ],
    []
  );

export const addFilterStateIfNotThere = (filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    if (filter.$state == null) {
      return { $state: { store: esFilters.FilterStateStore.APP_STATE }, ...filter };
    } else {
      return filter;
    }
  });
};

export const getDescriptionItem = (
  field: string,
  label: string,
  data: unknown,
  filterManager: FilterManager,
  indexPatterns?: IIndexPattern
): ListItems[] => {
  if (field === 'queryBar') {
    const filters = addFilterStateIfNotThere(get('queryBar.filters', data) ?? []);
    const query = get('queryBar.query.query', data);
    const savedId = get('queryBar.saved_id', data);
    return buildQueryBarDescription({
      field,
      filters,
      filterManager,
      query,
      savedId,
      indexPatterns,
    });
  } else if (field === 'threat') {
    const threat: IMitreEnterpriseAttack[] = get(field, data).filter(
      (singleThreat: IMitreEnterpriseAttack) => singleThreat.tactic.name !== 'none'
    );
    return buildThreatDescription({ label, threat });
  } else if (field === 'references') {
    const urls: string[] = get(field, data);
    return buildUrlsDescription(label, urls);
  } else if (field === 'falsePositives') {
    const values: string[] = get(field, data);
    return buildUnorderedListArrayDescription(label, field, values);
  } else if (Array.isArray(get(field, data))) {
    const values: string[] = get(field, data);
    return buildStringArrayDescription(label, field, values);
    // TODO: Add custom UI for Risk/Severity Mappings (and fix missing label)
  } else if (field === 'riskScore') {
    const val: AboutStepRiskScore = get(field, data);
    return [
      {
        title: label,
        description: val.value,
      },
    ];
  } else if (field === 'severity') {
    const val: AboutStepSeverity = get(field, data);
    return buildSeverityDescription(label, val.value);
  } else if (field === 'timeline') {
    const timeline = get(field, data) as FieldValueTimeline;
    return [
      {
        title: label,
        description: timeline.title ?? DEFAULT_TIMELINE_TITLE,
      },
    ];
  } else if (field === 'note') {
    const val: string = get(field, data);
    return buildNoteDescription(label, val);
  } else if (field === 'ruleType') {
    const ruleType: RuleType = get(field, data);
    return buildRuleTypeDescription(label, ruleType);
  }

  const description: string = get(field, data);
  if (isNumber(description) || !isEmpty(description)) {
    return [
      {
        title: label,
        description,
      },
    ];
  }
  return [];
};
