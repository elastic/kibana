/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiFormRow, EuiIcon } from '@elastic/eui';

import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isQueryRule,
} from '../../../../../common/detection_engine/utils';
import { FieldHook } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { MlCardDescription } from './ml_card_description';
import EqlSearchIcon from './eql_search_icon.svg';

interface SelectRuleTypeProps {
  describedByIds?: string[];
  field: FieldHook;
  hasValidLicense?: boolean;
  isMlAdmin?: boolean;
  isReadOnly?: boolean;
}

export const SelectRuleType: React.FC<SelectRuleTypeProps> = ({
  describedByIds = [],
  field,
  isReadOnly = false,
  hasValidLicense = false,
  isMlAdmin = false,
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
  const mlCardDisabled = isReadOnly || !hasValidLicense || !isMlAdmin;
  const licensingUrl = useKibana().services.application.getUrlForApp('kibana', {
    path: '#/management/stack/license_management',
  });

  const eqlSelectableConfig = useMemo(
    () => ({
      isDisabled: isReadOnly,
      onClick: setEql,
      isSelected: isEqlRule(ruleType),
    }),
    [isReadOnly, ruleType, setEql]
  );

  const querySelectableConfig = useMemo(
    () => ({
      isDisabled: isReadOnly,
      onClick: setQuery,
      isSelected: isQueryRule(ruleType),
    }),
    [isReadOnly, ruleType, setQuery]
  );

  const mlSelectableConfig = useMemo(
    () => ({
      isDisabled: mlCardDisabled,
      onClick: setMl,
      isSelected: isMlRule(ruleType),
    }),
    [mlCardDisabled, ruleType, setMl]
  );

  const thresholdSelectableConfig = useMemo(
    () => ({
      isDisabled: isReadOnly,
      onClick: setThreshold,
      isSelected: isThresholdRule(ruleType),
    }),
    [isReadOnly, ruleType, setThreshold]
  );

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="selectRuleType"
      describedByIds={describedByIds}
      label={field.label}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="customRuleType"
            title={i18n.QUERY_TYPE_TITLE}
            description={i18n.QUERY_TYPE_DESCRIPTION}
            icon={<EuiIcon size="l" type="search" />}
            isDisabled={querySelectableConfig.isDisabled && !querySelectableConfig.isSelected}
            selectable={querySelectableConfig}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="machineLearningRuleType"
            title={i18n.ML_TYPE_TITLE}
            description={
              <MlCardDescription subscriptionUrl={licensingUrl} hasValidLicense={hasValidLicense} />
            }
            icon={<EuiIcon size="l" type="machineLearningApp" />}
            isDisabled={mlSelectableConfig.isDisabled && !mlSelectableConfig.isSelected}
            selectable={mlSelectableConfig}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="thresholdRuleType"
            title={i18n.THRESHOLD_TYPE_TITLE}
            description={i18n.THRESHOLD_TYPE_DESCRIPTION}
            icon={<EuiIcon size="l" type="indexFlush" />}
            isDisabled={
              thresholdSelectableConfig.isDisabled && !thresholdSelectableConfig.isSelected
            }
            selectable={thresholdSelectableConfig}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="eqlRuleType"
            title={i18n.EQL_TYPE_TITLE}
            description={i18n.EQL_TYPE_DESCRIPTION}
            icon={<EuiIcon size="l" type={EqlSearchIcon} />}
            isDisabled={eqlSelectableConfig.isDisabled && !eqlSelectableConfig.isSelected}
            selectable={eqlSelectableConfig}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFormRow>
  );
};
