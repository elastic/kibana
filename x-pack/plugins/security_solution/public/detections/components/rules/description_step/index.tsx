/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEmpty, chunk, get, pick, isNumber } from 'lodash/fp';
import React, { memo, useState } from 'react';
import styled from 'styled-components';

import type { ThreatMapping, Threats, Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase, Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';
import { buildRelatedIntegrationsDescription } from '../related_integrations/integrations_description';
import type {
  RelatedIntegrationArray,
  RequiredFieldArray,
} from '../../../../../common/detection_engine/schemas/common';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import type { EqlOptionsSelected } from '../../../../../common/search_strategy';
import { useKibana } from '../../../../common/lib/kibana';
import type {
  AboutStepRiskScore,
  AboutStepSeverity,
} from '../../../pages/detection_engine/rules/types';
import type { FieldValueTimeline } from '../pick_timeline';
import type { FormSchema } from '../../../../shared_imports';
import type { ListItems } from './types';
import {
  buildQueryBarDescription,
  buildSeverityDescription,
  buildStringArrayDescription,
  buildThreatDescription,
  buildUnorderedListArrayDescription,
  buildUrlsDescription,
  buildNoteDescription,
  buildRiskScoreDescription,
  buildRuleTypeDescription,
  buildThresholdDescription,
  buildThreatMappingDescription,
  buildEqlOptionsDescription,
  buildRequiredFieldsDescription,
} from './helpers';
import { buildMlJobsDescription } from './ml_job_description';
import { buildActionsDescription } from './actions_description';
import { buildThrottleDescription } from './throttle_description';
import { THREAT_QUERY_LABEL } from './translations';
import { filterEmptyThreats } from '../../../../detection_engine/rule_creation_ui/pages/rule_creation/helpers';

const DescriptionListContainer = styled(EuiDescriptionList)`
  &.euiDescriptionList--column .euiDescriptionList__title {
    width: 30%;
  }
  &.euiDescriptionList--column .euiDescriptionList__description {
    width: 70%;
    overflow-wrap: anywhere;
  }
`;

interface StepRuleDescriptionProps<T> {
  columns?: 'multi' | 'single' | 'singleSplit';
  data: unknown;
  indexPatterns?: DataViewBase;
  schema: FormSchema<T>;
}

export const StepRuleDescriptionComponent = <T,>({
  data,
  columns = 'multi',
  indexPatterns,
  schema,
}: StepRuleDescriptionProps<T>) => {
  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));

  const keys = Object.keys(schema);
  const listItems = keys.reduce((acc: ListItems[], key: string) => {
    if (key === 'machineLearningJobId') {
      return [
        ...acc,
        buildMlJobsDescription(
          get(key, data) as string[],
          (get(key, schema) as { label: string }).label
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

export const buildListItems = <T,>(
  data: unknown,
  schema: FormSchema<T>,
  filterManager: FilterManager,
  indexPatterns?: DataViewBase
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
      return { $state: { store: FilterStateStore.APP_STATE }, ...filter };
    } else {
      return filter;
    }
  });
};

/* eslint complexity: ["error", 25]*/
// eslint-disable-next-line complexity
export const getDescriptionItem = (
  field: string,
  label: string,
  data: unknown,
  filterManager: FilterManager,
  indexPatterns?: DataViewBase
): ListItems[] => {
  if (field === 'queryBar') {
    const filters = addFilterStateIfNotThere(get('queryBar.filters', data) ?? []);
    const query = get('queryBar.query.query', data);
    const savedId = get('queryBar.saved_id', data);
    const savedQueryName = get('queryBar.title', data);
    return buildQueryBarDescription({
      field,
      filters,
      filterManager,
      query,
      savedId,
      savedQueryName,
      indexPatterns,
    });
  } else if (field === 'eqlOptions') {
    const eqlOptions: EqlOptionsSelected = get(field, data);
    return buildEqlOptionsDescription(eqlOptions);
  } else if (field === 'threat') {
    const threats: Threats = get(field, data);
    return buildThreatDescription({ label, threat: filterEmptyThreats(threats) });
  } else if (field === 'threshold') {
    const threshold = get(field, data);
    return buildThresholdDescription(label, threshold);
  } else if (field === 'references') {
    const urls: string[] = get(field, data);
    return buildUrlsDescription(label, urls);
  } else if (field === 'falsePositives') {
    const values: string[] = get(field, data);
    return buildUnorderedListArrayDescription(label, field, values);
  } else if (field === 'riskScore') {
    const values: AboutStepRiskScore = get(field, data);
    return buildRiskScoreDescription(values);
  } else if (field === 'severity') {
    const values: AboutStepSeverity = get(field, data);
    return buildSeverityDescription(values);
  } else if (field === 'requiredFields') {
    const requiredFields: RequiredFieldArray = get(field, data);
    return buildRequiredFieldsDescription(label, requiredFields);
  } else if (field === 'relatedIntegrations') {
    const relatedIntegrations: RelatedIntegrationArray = get(field, data);
    return buildRelatedIntegrationsDescription(label, relatedIntegrations);
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
    const ruleType: Type = get(field, data);
    return buildRuleTypeDescription(label, ruleType);
  } else if (field === 'kibanaSiemAppUrl') {
    return [];
  } else if (field === 'threatQueryBar') {
    const filters = addFilterStateIfNotThere(get('threatQueryBar.filters', data) ?? []);
    const query = get('threatQueryBar.query.query', data);
    const savedId = get('threatQueryBar.saved_id', data);
    return buildQueryBarDescription({
      field,
      filters,
      filterManager,
      query,
      savedId,
      indexPatterns,
      queryLabel: THREAT_QUERY_LABEL,
    });
  } else if (field === 'threatMapping') {
    const threatMap: ThreatMapping = get(field, data);
    return buildThreatMappingDescription(label, threatMap);
  } else if (field === 'dataViewId') {
    return [];
  } else if (Array.isArray(get(field, data)) && field !== 'threatMapping') {
    const values: string[] = get(field, data);
    return buildStringArrayDescription(label, field, values);
  } else if (field === 'index') {
    if (get('dataViewId', data)) {
      return [];
    }
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
