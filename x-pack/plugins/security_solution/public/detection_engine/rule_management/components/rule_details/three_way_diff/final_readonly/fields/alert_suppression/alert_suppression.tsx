/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as ruleDetailsI18n from '../../../../translations';
import type {
  AlertSuppression,
  DiffableRuleTypes,
} from '../../../../../../../../../common/api/detection_engine';
import { AlertSuppressionLabel } from '../../../../../../../rule_creation_ui/components/description_step/alert_suppression_label';
import {
  MissingFieldsStrategy,
  SuppressAlertsByField,
  SuppressAlertsDuration,
} from '../../../../rule_definition_section';

interface AlertSuppressionReadOnlyProps {
  alertSuppression?: AlertSuppression;
  ruleType: DiffableRuleTypes;
}

export function AlertSuppressionReadOnly({
  alertSuppression,
  ruleType,
}: AlertSuppressionReadOnlyProps) {
  if (!alertSuppression) {
    return null;
  }

  const listItems = [
    {
      title: (
        <AlertSuppressionLabel
          label={ruleDetailsI18n.SUPPRESS_ALERTS_BY_FIELD_LABEL}
          ruleType={ruleType}
        />
      ),
      description: <SuppressAlertsByField fields={alertSuppression.group_by} />,
    },
    {
      title: (
        <span data-test-subj="alertSuppressionDurationPropertyTitle">
          <AlertSuppressionLabel
            label={ruleDetailsI18n.SUPPRESS_ALERTS_DURATION_FIELD_LABEL}
            ruleType={ruleType}
          />
        </span>
      ),
      description: <SuppressAlertsDuration duration={alertSuppression.duration} />,
    },
  ];

  if (alertSuppression.missing_fields_strategy) {
    listItems.push({
      title: (
        <span data-test-subj="alertSuppressionMissingFieldPropertyTitle">
          <AlertSuppressionLabel
            label={ruleDetailsI18n.SUPPRESSION_FIELD_MISSING_FIELD_LABEL}
            ruleType={ruleType}
          />
        </span>
      ),
      description: (
        <MissingFieldsStrategy missingFieldsStrategy={alertSuppression.missing_fields_strategy} />
      ),
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
}
