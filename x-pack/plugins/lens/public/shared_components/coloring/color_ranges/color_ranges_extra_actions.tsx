/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, Dispatch } from 'react';
import { EuiFlexGroup, EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

import { DistributeEquallyIcon } from '../../../assets/distribute_equally';
import { TooltipWrapper } from '../../index';

import type { ColorRangesActions } from './types';
import type { DataBounds } from '../types';

export interface ColorRangesExtraActionsProps {
  dispatch: Dispatch<ColorRangesActions>;
  dataBounds: DataBounds;
  shouldDisableAdd?: boolean;
  shouldDisableReverse?: boolean;
  shouldDisableDistribute?: boolean;
}

export function ColorRangesExtraActions({
  dispatch,
  dataBounds,
  shouldDisableAdd = false,
  shouldDisableReverse = false,
  shouldDisableDistribute = false,
}: ColorRangesExtraActionsProps) {
  const onAddColorRange = useCallback(() => {
    dispatch({
      type: 'addColorRange',
      payload: { dataBounds },
    });
  }, [dataBounds, dispatch]);

  const onReversePalette = useCallback(() => {
    dispatch({ type: 'reversePalette' });
  }, [dispatch]);

  const onDistributeEqually = useCallback(() => {
    dispatch({ type: 'distributeEqually', payload: { dataBounds } });
  }, [dataBounds, dispatch]);

  return (
    <EuiFlexGroup justifyContent="flexStart" gutterSize="none" wrap={true}>
      <EuiFlexItem grow={false}>
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
            data-test-subj={`lnsPalettePanel_dynamicColoring_addColorRange`}
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={`lnsPalettePanel_dynamicColoring_reverseColors`}
          iconType="sortable"
          color="primary"
          aria-label={i18n.translate('xpack.lens.dynamicColoring.customPaletteAriaLabel', {
            defaultMessage: 'Reverse colors',
          })}
          size="xs"
          flush="left"
          onClick={onReversePalette}
          disabled={shouldDisableReverse}
        >
          <FormattedMessage
            id="xpack.lens.dynamicColoring.customPalette.reverseColors"
            defaultMessage="Reverse colors"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={`lnsPalettePanel_dynamicColoring_distributeEqually`}
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
          disabled={shouldDisableDistribute}
          onClick={onDistributeEqually}
        >
          <FormattedMessage
            id="xpack.lens.dynamicColoring.customPalette.distributeEqually"
            defaultMessage="Distribute equally"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
