/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo, VFC } from 'react';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../types';
import { unwrapValue } from '../../../utils';
import { IndicatorEmptyPrompt } from '../empty_prompt';
import { IndicatorBlock } from './block';
import { HighlightedValuesTable } from './highlighted_values_table';

const highLevelFields = [
  RawIndicatorFieldId.Feed,
  RawIndicatorFieldId.Type,
  RawIndicatorFieldId.MarkingTLP,
  RawIndicatorFieldId.Confidence,
];

export const TI_FLYOUT_OVERVIEW_TABLE = 'tiFlyoutOverviewTableRow';
export const TI_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS = 'tiFlyoutOverviewHighLevelBlocks';

export interface IndicatorsFlyoutOverviewProps {
  indicator: Indicator;
  onViewAllFieldsInTable: VoidFunction;
}

export const IndicatorsFlyoutOverview: VFC<IndicatorsFlyoutOverviewProps> = ({
  indicator,
  onViewAllFieldsInTable,
}) => {
  const indicatorType = unwrapValue(indicator, RawIndicatorFieldId.Type);

  const highLevelBlocks = useMemo(
    () => (
      <EuiFlexGroup data-test-subj={TI_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}>
        {highLevelFields.map((field) => (
          <EuiFlexItem key={field}>
            <IndicatorBlock
              indicator={indicator}
              field={field}
              data-test-subj={TI_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    ),
    [indicator]
  );

  const indicatorDescription = useMemo(() => {
    const unwrappedDescription = unwrapValue(indicator, RawIndicatorFieldId.Description);

    return unwrappedDescription ? <EuiText>{unwrappedDescription}</EuiText> : null;
  }, [indicator]);

  const indicatorName = unwrapValue(indicator, RawIndicatorFieldId.Name) || EMPTY_VALUE;

  if (!indicatorType) {
    return <IndicatorEmptyPrompt />;
  }

  return (
    <>
      <EuiTitle>
        <h2>{indicatorName}</h2>
      </EuiTitle>

      {indicatorDescription}

      <EuiSpacer />

      {highLevelBlocks}

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.threatIntelligence.indicator.flyoutOverviewTable.highlightedFields"
                defaultMessage="Highlighted fields"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onViewAllFieldsInTable}>
            <FormattedMessage
              id="xpack.threatIntelligence.indicator.flyoutOverviewTable.viewAllFieldsInTable"
              defaultMessage="View all fields in table"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <HighlightedValuesTable indicator={indicator} data-test-subj={TI_FLYOUT_OVERVIEW_TABLE} />
    </>
  );
};
