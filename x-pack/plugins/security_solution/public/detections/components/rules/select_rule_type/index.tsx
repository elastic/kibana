/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiFormRow, EuiIcon } from '@elastic/eui';

import { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isQueryRule,
  isThreatMatchRule,
} from '../../../../../common/detection_engine/utils';
import { FieldHook } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { MlCardDescription } from './ml_card_description';

interface SelectRuleTypeProps {
  describedByIds: string[];
  field: FieldHook;
  hasValidLicense: boolean;
  isMlAdmin: boolean;
  isUpdateView: boolean;
}

export const SelectRuleType: React.FC<SelectRuleTypeProps> = ({
  describedByIds = [],
  field,
  isUpdateView,
  hasValidLicense,
  isMlAdmin,
}) => {
  const ruleType = field.value as Type;
  const setType = useCallback(
    (type: Type) => {
      field.setValue(type);
    },
    [field]
  );
  const setEql = useCallback(() => setType('eql'), [setType]);
  const setMl = useCallback(() => setType('machine_learning'), [setType]);
  const setQuery = useCallback(() => setType('query'), [setType]);
  const setThreshold = useCallback(() => setType('threshold'), [setType]);
  const setThreatMatch = useCallback(() => setType('threat_match'), [setType]);
  const licensingUrl = useKibana().services.application.getUrlForApp('kibana', {
    path: '#/management/stack/license_management',
  });

  const eqlSelectableConfig = useMemo(
    () => ({
      onClick: setEql,
      isSelected: isEqlRule(ruleType),
    }),
    [ruleType, setEql]
  );

  const querySelectableConfig = useMemo(
    () => ({
      onClick: setQuery,
      isSelected: isQueryRule(ruleType),
    }),
    [ruleType, setQuery]
  );

  const mlSelectableConfig = useMemo(
    () => ({
      isDisabled: !hasValidLicense || !isMlAdmin,
      onClick: setMl,
      isSelected: isMlRule(ruleType),
    }),
    [ruleType, setMl, hasValidLicense, isMlAdmin]
  );

  const thresholdSelectableConfig = useMemo(
    () => ({
      onClick: setThreshold,
      isSelected: isThresholdRule(ruleType),
    }),
    [ruleType, setThreshold]
  );

  const threatMatchSelectableConfig = useMemo(
    () => ({
      onClick: setThreatMatch,
      isSelected: isThreatMatchRule(ruleType),
    }),
    [ruleType, setThreatMatch]
  );

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="selectRuleType"
      describedByIds={describedByIds}
      label={field.label}
    >
      <EuiFlexGrid columns={3}>
        {(!isUpdateView || querySelectableConfig.isSelected) && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="customRuleType"
              title={i18n.QUERY_TYPE_TITLE}
              titleSize="xs"
              description={i18n.QUERY_TYPE_DESCRIPTION}
              icon={<EuiIcon size="xl" type="search" />}
              selectable={querySelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || mlSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="machineLearningRuleType"
              title={i18n.ML_TYPE_TITLE}
              titleSize="xs"
              description={
                <MlCardDescription
                  subscriptionUrl={licensingUrl}
                  hasValidLicense={hasValidLicense}
                />
              }
              icon={<EuiIcon size="l" type="machineLearningApp" />}
              isDisabled={mlSelectableConfig.isDisabled && !mlSelectableConfig.isSelected}
              selectable={mlSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || thresholdSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="thresholdRuleType"
              title={i18n.THRESHOLD_TYPE_TITLE}
              titleSize="xs"
              description={i18n.THRESHOLD_TYPE_DESCRIPTION}
              icon={<EuiIcon size="l" type="indexFlush" />}
              selectable={thresholdSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || eqlSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="eqlRuleType"
              title={i18n.EQL_TYPE_TITLE}
              titleSize="xs"
              description={i18n.EQL_TYPE_DESCRIPTION}
              icon={<EuiIcon size="l" type="eql" />}
              selectable={eqlSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || threatMatchSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <EuiCard
              data-test-subj="threatMatchRuleType"
              title={i18n.THREAT_MATCH_TYPE_TITLE}
              titleSize="xs"
              description={i18n.THREAT_MATCH_TYPE_DESCRIPTION}
              icon={<EuiIcon size="l" type="list" />}
              selectable={threatMatchSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGrid>
    </EuiFormRow>
  );
};
