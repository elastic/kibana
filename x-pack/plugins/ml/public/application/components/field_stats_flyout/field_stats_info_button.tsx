/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldIcon } from '@kbn/react-field';
import { EVENT_RATE_FIELD_ID, type Field } from '@kbn/ml-anomaly-utils';
import { getKbnFieldIconType } from '../../../../common/util/get_field_icon_types';

export type FieldForStats = Pick<Field, 'id' | 'type'>;
export const FieldStatsInfoButton = ({
  field,
  label,
  onButtonClick,
  disabled,
  isEmpty,
}: {
  field: FieldForStats;
  label: string;
  searchValue?: string;
  disabled?: boolean;
  isEmpty?: boolean;
  onButtonClick?: (field: FieldForStats) => void;
}) => {
  const isDisabled = disabled === true || field.id === EVENT_RATE_FIELD_ID;
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltip',
            {
              defaultMessage: 'Inspect field statistics',
            }
          )}
        >
          <EuiButtonIcon
            data-test-subj={`mlInspectFieldStatsButton-${field.id}`}
            // Only disable the button if explicitly disabled
            disabled={isDisabled}
            size="xs"
            iconType="inspect"
            css={{ color: isEmpty ? 'gray' : undefined }}
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              if (ev.type === 'click') {
                ev.currentTarget.focus();
              }
              ev.preventDefault();
              ev.stopPropagation();

              if (onButtonClick) {
                onButtonClick(field);
              }
            }}
            aria-label={i18n.translate(
              'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltipArialabel',
              {
                defaultMessage: 'Inspect field statistics',
              }
            )}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: '4px' }}>
        <FieldIcon
          color={isEmpty ? 'gray' : undefined}
          type={getKbnFieldIconType(field.type)}
          fill="none"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiText color={isEmpty ? 'subdued' : undefined} size="s">
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
