/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CurveType } from '@elastic/charts';
import { EuiFormRow, EuiIconTip, EuiSuperSelect } from '@elastic/eui';
import { ToolbarPopover } from '../toolbar_popover';

export interface CurveSettingsPopoverProps {
  /**
   * Currently selected value
   */
  value: CurveType;
  /**
   * Callback on display option change
   */
  onChange: (id: CurveType) => void;
  isDisabled: boolean;
}
export const curveStyleOptions = [
  {
    id: 9,
    title: i18n.translate('xpack.lens.curveStyle.linear', {
      defaultMessage: 'Linear',
    }),
  },
  {
    id: 0,
    title: i18n.translate('xpack.lens.curveStyle.ordinal', {
      defaultMessage: 'Ordinal',
    }),
  },
  {
    id: 1,
    title: i18n.translate('xpack.lens.curveStyle.natural', {
      defaultMessage: 'Natural',
    }),
  },
  {
    id: 2,
    title: i18n.translate('xpack.lens.curveStyle.monotoneX', {
      defaultMessage: 'Monotone X',
    }),
  },
  {
    id: 3,
    title: i18n.translate('xpack.lens.curveStyle.monotoneY', {
      defaultMessage: 'Monotone Y',
    }),
  },
  {
    id: 4,
    title: i18n.translate('xpack.lens.curveStyle.basis', {
      defaultMessage: 'Basis',
    }),
  },
  {
    id: 5,
    title: i18n.translate('xpack.lens.curveStyle.catmullRom', {
      defaultMessage: 'Catmull Rom',
    }),
  },
  {
    id: 6,
    title: i18n.translate('xpack.lens.curveStyle.step', {
      defaultMessage: 'Step',
    }),
  },
  {
    id: 7,
    title: i18n.translate('xpack.lens.curveStyle.stepAfter', {
      defaultMessage: 'Step After',
    }),
  },
  {
    id: 8,
    title: i18n.translate('xpack.lens.curveStyle.stepBefore', {
      defaultMessage: 'Step Before',
    }),
  },
] as const;

export const CurveSettingsPopover: React.FunctionComponent<CurveSettingsPopoverProps> = ({
  onChange,
  value,
  isDisabled,
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.curveLabel', {
        defaultMessage: 'Line curve style',
      })}
      type="curve"
      groupPosition="right"
      buttonDataTestSubj="lnsLegendButton"
      isDisabled={isDisabled}
    >
      <EuiFormRow
        display="columnCompressed"
        label={
          <>
            {i18n.translate('xpack.lens.xyChart.curveStyleLabel', {
              defaultMessage: 'Style',
            })}
            <EuiIconTip
              color="subdued"
              content={i18n.translate('xpack.lens.xyChart.missingValuesLabelHelpText', {
                defaultMessage: `By default, Lens hides the gaps in the data. To fill the gap, make a selection.`,
              })}
              iconProps={{
                className: 'eui-alignTop',
              }}
              position="top"
              size="s"
              type="questionInCircle"
            />
          </>
        }
      >
        <EuiSuperSelect
          data-test-subj="lnsCurveStyleSelect"
          compressed
          options={curveStyleOptions.map(({ id, title }) => {
            return {
              value: String(id),
              dropdownDisplay: (
                <>
                  <strong>{title}</strong>
                </>
              ),
              inputDisplay: title,
            };
          })}
          valueOfSelected={value ? String(value) : String(CurveType.LINEAR)}
          onChange={(valueN) => onChange(Number(valueN) as CurveType)}
          itemLayoutAlign="top"
          hasDividers
        />
      </EuiFormRow>
    </ToolbarPopover>
  );
};
