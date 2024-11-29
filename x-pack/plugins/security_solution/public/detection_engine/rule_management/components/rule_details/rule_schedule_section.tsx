/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiText } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import { IntervalAbbrScreenReader } from '../../../../common/components/accessibility';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { getHumanizedDuration } from '../../../../detections/pages/detection_engine/rules/helpers';
import { DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS } from './constants';
import * as i18n from './translations';

interface AccessibleTimeValueProps {
  timeValue: string;
  'data-test-subj'?: string;
}

export const AccessibleTimeValue = ({
  timeValue,
  'data-test-subj': dataTestSubj,
}: AccessibleTimeValueProps) => (
  <EuiText size="s" data-test-subj={dataTestSubj}>
    <IntervalAbbrScreenReader interval={timeValue} />
  </EuiText>
);

interface IntervalProps {
  interval: string;
}

const Interval = ({ interval }: IntervalProps) => (
  <AccessibleTimeValue timeValue={interval} data-test-subj="intervalPropertyValue" />
);

interface FromProps {
  from: string;
  interval: string;
}

const From = ({ from, interval }: FromProps) => (
  <AccessibleTimeValue
    timeValue={getHumanizedDuration(from, interval)}
    data-test-subj={`fromPropertyValue-${from}`}
  />
);

export interface RuleScheduleSectionProps extends React.ComponentProps<typeof EuiDescriptionList> {
  rule: Partial<RuleResponse>;
  columnWidths?: EuiDescriptionListProps['columnWidths'];
}

export const RuleScheduleSection = ({
  rule,
  columnWidths = DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  ...descriptionListProps
}: RuleScheduleSectionProps) => {
  if (!rule.interval || !rule.from) {
    return null;
  }

  const ruleSectionListItems = [];

  ruleSectionListItems.push(
    {
      title: <span data-test-subj="intervalPropertyTitle">{i18n.INTERVAL_FIELD_LABEL}</span>,
      description: <Interval interval={rule.interval} />,
    },
    {
      title: <span data-test-subj="fromPropertyTitle">{i18n.FROM_FIELD_LABEL}</span>,
      description: <From from={rule.from} interval={rule.interval} />,
    }
  );

  return (
    <div data-test-subj="listItemColumnStepRuleDescription">
      <EuiDescriptionList
        type={descriptionListProps.type ?? 'column'}
        rowGutterSize={descriptionListProps.rowGutterSize ?? 'm'}
        listItems={ruleSectionListItems}
        columnWidths={columnWidths}
        {...descriptionListProps}
      />
    </div>
  );
};
