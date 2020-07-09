/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiText,
} from '@elastic/eui';

import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { RuleType } from '../../../../../common/detection_engine/types';
import { FieldHook } from '../../../../shared_imports';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

const MlCardDescription = ({
  subscriptionUrl,
  hasValidLicense = false,
}: {
  subscriptionUrl: string;
  hasValidLicense?: boolean;
}) => (
  <EuiText size="s">
    {hasValidLicense ? (
      i18n.ML_TYPE_DESCRIPTION
    ) : (
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.createRule.stepDefineRule.ruleTypeField.mlTypeDisabledDescription"
        defaultMessage="Access to ML requires a {subscriptionsLink}."
        values={{
          subscriptionsLink: (
            <EuiLink href={subscriptionUrl} target="_blank">
              <FormattedMessage
                id="xpack.securitySolution.components.stepDefineRule.ruleTypeField.subscriptionsLink"
                defaultMessage="Platinum subscription"
              />
            </EuiLink>
          ),
        }}
      />
    )}
  </EuiText>
);

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
  const ruleType = field.value as RuleType;
  const setType = useCallback(
    (type: RuleType) => {
      field.setValue(type);
    },
    [field]
  );
  const setMl = useCallback(() => setType('machine_learning'), [setType]);
  const setQuery = useCallback(() => setType('query'), [setType]);
  const mlCardDisabled = isReadOnly || !hasValidLicense || !isMlAdmin;
  const licensingUrl = useKibana().services.application.getUrlForApp('kibana', {
    path: '#/management/stack/license_management',
  });

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
            selectable={{
              isDisabled: isReadOnly,
              onClick: setQuery,
              isSelected: !isMlRule(ruleType),
            }}
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
            isDisabled={mlCardDisabled}
            selectable={{
              isDisabled: mlCardDisabled,
              onClick: setMl,
              isSelected: isMlRule(ruleType),
            }}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFormRow>
  );
};
