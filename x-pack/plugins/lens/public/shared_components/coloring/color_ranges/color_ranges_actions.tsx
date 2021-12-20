/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiButtonEmpty } from '@elastic/eui';
import { DistributeEquallyIcon } from '../../../assets/distribute_equally';
import { TooltipWrapper } from '../../index';

import type { ColorRange, DataBounds, ColorRangesUpdateFn } from './types';
import type { CustomPaletteParamsConfig } from '../../../../common';
import { reversePalette, addColorRange, distributeEqually } from './utils';

export interface ColorRangesActionsProps {
  colorRanges: ColorRange[];
  paletteConfiguration: CustomPaletteParamsConfig | undefined;
  setColorRanges: ColorRangesUpdateFn;
  dataBounds: DataBounds;
}

export function ColorRangesActions({
  colorRanges,
  dataBounds,
  setColorRanges,
  paletteConfiguration,
}: ColorRangesActionsProps) {
  const rangeType = paletteConfiguration?.rangeType ?? 'percent';

  const shouldDisableAdd = Boolean(
    paletteConfiguration?.maxSteps && colorRanges.length >= paletteConfiguration?.maxSteps
  );

  const onAddColorRange = useCallback(() => {
    setColorRanges({ colorRanges: addColorRange(colorRanges, rangeType, dataBounds) });
  }, [colorRanges, dataBounds, rangeType, setColorRanges]);

  const onReversePalette = useCallback(() => {
    setColorRanges({ colorRanges: reversePalette(colorRanges) });
  }, [colorRanges, setColorRanges]);

  const onDistributeEqually = useCallback(() => {
    setColorRanges({ colorRanges: distributeEqually(colorRanges) });
  }, [colorRanges, setColorRanges]);

  return (
    <>
      <EuiFlexGroup justifyContent="spaceAround" gutterSize="s">
        <TooltipWrapper
          tooltipContent={i18n.translate(
            'xpack.lens.dynamicColoring.customPalette.maximumStepsApplied',
            {
              defaultMessage: `You've applied the maximum number of steps`,
            }
          )}
          condition={shouldDisableAdd}
          position="top"
          delay="regular"
        >
          <EuiButtonEmpty
            data-test-subj={`dynamicColoring_addColorRange`}
            iconType="plusInCircle"
            color="primary"
            aria-label={i18n.translate(
              'xpack.lens.dynamicColoring.customPalette.addColorRangeAriaLabel',
              {
                defaultMessage: 'Add color range',
              }
            )}
            size="xs"
            flush="left"
            disabled={shouldDisableAdd}
            onClick={onAddColorRange}
          >
            <FormattedMessage
              id="xpack.lens.dynamicColoring.customPalette.addColorRange"
              defaultMessage="Add color range"
            />
          </EuiButtonEmpty>
        </TooltipWrapper>
        <EuiButtonEmpty
          data-test-subj={`dynamicColoring_reverseColors`}
          iconType="sortable"
          color="primary"
          aria-label={i18n.translate('xpack.lens.dynamicColoring.customPaletteAriaLabel', {
            defaultMessage: 'Reverse colors',
          })}
          size="xs"
          flush="left"
          onClick={onReversePalette}
        >
          <FormattedMessage
            id="xpack.lens.dynamicColoring.customPalette.reverseColors"
            defaultMessage="Reverse colors"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty
          data-test-subj={`dynamicColoring_distributeEqually`}
          iconType={DistributeEquallyIcon}
          color="primary"
          aria-label={i18n.translate(
            'xpack.lens.dynamicColoring.customPalette.distributeEquallyAriaLabel',
            {
              defaultMessage: 'Distribute equally',
            }
          )}
          size="xs"
          flush="left"
          onClick={onDistributeEqually}
        >
          <FormattedMessage
            id="xpack.lens.dynamicColoring.customPalette.distributeEqually"
            defaultMessage="Distribute equally"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </>
  );
}
