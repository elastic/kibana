/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiHighlight, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldIcon } from '@kbn/react-field';
import { EVENT_RATE_FIELD_ID, Field } from '../../../../../../common/types/fields';
import { getKbnFieldIconType } from '../../../../../../common/util/get_field_icon_types';

export const FieldStatsInfoButton = ({
  field,
  label,
  searchValue = '',
  onButtonClick,
}: {
  field: Field;
  label: string;
  searchValue?: string;
  onButtonClick?: (field: Field) => void;
}) => {
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
            disabled={field.id === EVENT_RATE_FIELD_ID}
            size="xs"
            iconType="inspect"
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
            data-test-subj={'mlAggSelectFieldStatsPopoverButton'}
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ paddingRight: '4px' }}>
        <FieldIcon type={getKbnFieldIconType(field.type)} fill="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiHighlight search={searchValue}>{label}</EuiHighlight>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
