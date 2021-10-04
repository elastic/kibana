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
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  FieldStats,
  isTopValuesStats,
} from '../../../../../common/search_strategies/field_stats_types';
import { TopValues } from './top_values';
import { IndexPatternField } from '../../../../../../../../src/plugins/data/common';
import { useTheme } from '../../../../hooks/use_theme';

export function CorrelationsContextPopover({
  fieldName,
  stats,
  onAddFilter,
}: {
  fieldName: string;
  stats?: FieldStats;
  onAddFilter: (
    field: IndexPatternField | string,
    value: string,
    type: '+' | '-'
  ) => void;
}) {
  const [infoIsOpen, setOpen] = useState(false);
  const theme = useTheme();
  const popoverStyle = {
    minWidth: `calc(${theme.eui.euiSizeXXL} * 6.5)`,
    maxWidth: `calc(${theme.eui.euiSizeXXL} * 7.5)`,
    background: 'red',
  };

  if (!isTopValuesStats(stats)) return null;
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
              defaultMessage: 'Show Top 10 field values',
            }
          )}
        >
          <EuiButtonIcon
            iconType="inspect"
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              setOpen(true);
            }}
            aria-label={i18n.translate(
              'xpack.apm.correlations.fieldContextPopover.topFieldValuesAriaLabel',
              {
                defaultMessage: 'Show Top 10 field values',
              }
            )}
            data-test-subj={'apmCorrelationsContextPopoverButton'}
            style={{ marginLeft: theme.eui.paddingSizes.xs }}
          />
        </EuiToolTip>
      }
      isOpen={infoIsOpen}
      closePopover={() => setOpen(false)}
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
        <>
          <TopValues stats={stats} onAddFilter={onAddFilter} />
          {stats.topValuesSampleSize !== undefined && (
            <Fragment>
              <EuiSpacer size="s" />
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.apm.correlations.fieldContextPopover.calculatedFromSampleDescription"
                  defaultMessage="Calculated from sample of {sampleSize} documents"
                  values={{
                    sampleSize: stats.topValuesSampleSize,
                  }}
                />
              </EuiText>
            </Fragment>
          )}
        </>
      ) : null}
    </EuiPopover>
  );
}
