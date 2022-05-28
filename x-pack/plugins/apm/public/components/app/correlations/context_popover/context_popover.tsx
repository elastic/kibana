/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FieldStats } from '../../../../../common/correlations/field_stats_types';
import { OnAddFilter, TopValues } from './top_values';
import { useTheme } from '../../../../hooks/use_theme';

export function CorrelationsContextPopover({
  fieldName,
  fieldValue,
  topValueStats,
  onAddFilter,
}: {
  fieldName: string;
  fieldValue: string | number;
  topValueStats?: FieldStats;
  onAddFilter: OnAddFilter;
}) {
  const [infoIsOpen, setInfoOpen] = useState(false);
  const theme = useTheme();

  if (!topValueStats) return null;

  const popoverTitle = (
    <EuiPopoverTitle
      style={{ textTransform: 'none' }}
      className="eui-textBreakWord"
    >
      <EuiFlexGroup responsive={false} gutterSize="s">
        <EuiFlexItem grow={true}>
          <h5>{fieldName}</h5>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopoverTitle>
  );

  return (
    <EuiPopover
      display="block"
      button={
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.correlations.fieldContextPopover.descriptionTooltipContent',
            {
              defaultMessage: 'Show top 10 field values',
            }
          )}
        >
          <EuiButtonIcon
            iconType="inspect"
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              setInfoOpen(!infoIsOpen);
            }}
            aria-label={i18n.translate(
              'xpack.apm.correlations.fieldContextPopover.topFieldValuesAriaLabel',
              {
                defaultMessage: 'Show top 10 field values',
              }
            )}
            data-test-subj={'apmCorrelationsContextPopoverButton'}
            style={{ marginLeft: theme.eui.paddingSizes.xs }}
          />
        </EuiToolTip>
      }
      isOpen={infoIsOpen}
      closePopover={() => setInfoOpen(false)}
      anchorPosition="rightCenter"
      data-test-subj={'apmCorrelationsContextPopover'}
    >
      {popoverTitle}
      <EuiTitle size="xxxs">
        <h5>
          {i18n.translate(
            'xpack.apm.correlations.fieldContextPopover.fieldTopValuesLabel',
            {
              defaultMessage: 'Top 10 values',
            }
          )}
        </h5>
      </EuiTitle>
      {infoIsOpen ? (
        <TopValues
          topValueStats={topValueStats}
          onAddFilter={onAddFilter}
          fieldValue={fieldValue}
        />
      ) : null}
    </EuiPopover>
  );
}
