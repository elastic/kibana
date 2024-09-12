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
import { type Field } from '@kbn/ml-anomaly-utils';
import { useCurrentThemeVars } from '../../contexts/kibana';
import { getKbnFieldIconType } from '../../../../common/util/get_field_icon_types';

export type FieldForStats = Pick<Field, 'id' | 'type'>;
export const FieldStatsInfoButton = ({
  field,
  label,
  onButtonClick,
  disabled,
  isEmpty = false,
  hideTrigger = false,
}: {
  field: FieldForStats;
  label: string;
  searchValue?: string;
  disabled?: boolean;
  isEmpty?: boolean;
  onButtonClick?: (field: FieldForStats) => void;
  hideTrigger?: boolean;
}) => {
  const themeVars = useCurrentThemeVars();
  const emptyFieldMessage = isEmpty
    ? ' ' +
      i18n.translate('xpack.ml.newJob.wizard.fieldContextPopover.emptyFieldInSampleDocsMsg', {
        defaultMessage: '(no data found in 1000 sample records)',
      })
    : '';
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        {!hideTrigger ? (
          <EuiToolTip
            content={
              i18n.translate(
                'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltip',
                {
                  defaultMessage: 'Inspect field statistics',
                }
              ) + emptyFieldMessage
            }
          >
            <EuiButtonIcon
              data-test-subj={`mlInspectFieldStatsButton-${field.id}`}
              disabled={disabled === true}
              size="xs"
              iconType="fieldStatistics"
              css={{ color: isEmpty ? themeVars.euiTheme.euiColorDisabled : undefined }}
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
              aria-label={
                i18n.translate(
                  'xpack.ml.newJob.wizard.fieldContextPopover.inspectFieldStatsTooltipAriaLabel',
                  {
                    defaultMessage: 'Inspect field statistics',
                  }
                ) + emptyFieldMessage
              }
            />
          </EuiToolTip>
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={{
          paddingRight: themeVars.euiTheme.euiSizeXS,
          paddingBottom: themeVars.euiTheme.euiSizeXS,
        }}
      >
        <FieldIcon
          color={isEmpty ? themeVars.euiTheme.euiColorDisabled : undefined}
          type={getKbnFieldIconType(field.type)}
          fill="none"
        />
      </EuiFlexItem>
      <EuiText
        color={isEmpty ? 'subdued' : undefined}
        size="s"
        aria-label={label}
        title={label}
        className="euiComboBoxOption__content"
        css={{ paddingBottom: themeVars.euiTheme.euiSizeXS }}
      >
        {label}
      </EuiText>
    </EuiFlexGroup>
  );
};
