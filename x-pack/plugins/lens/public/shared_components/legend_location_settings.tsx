/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup, EuiRange } from '@elastic/eui';
import { VerticalAlignment, HorizontalAlignment } from '@elastic/charts';
import { useDebouncedValue } from './debounced_value';

export interface LegendLocationSettingsProps {
  /**
   * Determines the legend location
   */
  location: 'inside' | 'outside';
  /**
   * Callback on location option change
   */
  onLocationChange: (id: string) => void;
  /**
   * Sets the vertical alignment for legend inside chart
   */
  verticalAlignment?: VerticalAlignment;
  /**
   * Sets the vertical alignment for legend inside chart
   */
  horizontalAlignment?: HorizontalAlignment;
  /**
   * Callback on horizontal alignment option change
   */
  onAlignmentChange?: (id: string, type: string) => void;
  /**
   * Sets the number of columns for legend inside chart
   */
  floatingColumns?: number;
  /**
   * Callback on horizontal alignment option change
   */
  onFloatingColumnsChange?: (value: number) => void;
}

const DEFAULT_FLOATING_COLUMNS = 1;

const locationOptions: Array<{
  id: string;
  value: 'outside' | 'inside';
  label: string;
}> = [
  {
    id: `xy_location_outside`,
    value: 'outside',
    label: i18n.translate('xpack.lens.xyChart.legendLocation.outside', {
      defaultMessage: 'Outside',
    }),
  },
  {
    id: `xy_location_inside`,
    value: 'inside',
    label: i18n.translate('xpack.lens.xyChart.legendLocation.inside', {
      defaultMessage: 'Inside',
    }),
  },
];

const verticalAlignButtonsIcons = [
  {
    id: VerticalAlignment.Bottom,
    label: i18n.translate('xpack.lens.shared.legendVerticalAlignBottom', {
      defaultMessage: 'Bottom',
    }),
    iconType: 'arrowDown',
  },
  {
    id: VerticalAlignment.Top,
    label: i18n.translate('xpack.lens.shared.legendVerticalAlignTop', {
      defaultMessage: 'Top',
    }),
    iconType: 'arrowUp',
  },
];

const horizontalAlignButtonsIcons = [
  {
    id: HorizontalAlignment.Left,
    label: i18n.translate('xpack.lens.shared.legendHorizontalAlignLeft', {
      defaultMessage: 'Left',
    }),
    iconType: 'arrowLeft',
  },
  {
    id: HorizontalAlignment.Right,
    label: i18n.translate('xpack.lens.shared.legendHorizontalAlignRight', {
      defaultMessage: 'Right',
    }),
    iconType: 'arrowRight',
  },
];

const FloatingColumnsSlider = ({
  value,
  setValue,
}: {
  value: number;
  setValue: (value: number) => void;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange: setValue });
  return (
    <EuiRange
      data-test-subj="lens-legend-location-columns-slider"
      value={inputValue}
      min={0}
      max={10}
      showInput
      compressed
      onChange={(e) => {
        handleInputChange(Number(e.currentTarget.value));
      }}
    />
  );
};

export const LegendLocationSettings: React.FunctionComponent<LegendLocationSettingsProps> = ({
  location,
  onLocationChange = () => {},
  verticalAlignment,
  horizontalAlignment,
  onAlignmentChange = () => {},
  floatingColumns,
  onFloatingColumnsChange = () => {},
}) => {
  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.legendLocationLabel', {
          defaultMessage: 'Location',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.shared.legendLocationLabel', {
            defaultMessage: 'Location',
          })}
          data-test-subj="lens-legend-location-btn"
          name="legendLocation"
          buttonSize="compressed"
          options={locationOptions}
          idSelected={locationOptions.find(({ value }) => value === location)!.id}
          onChange={(optionId) => {
            const newLocation = locationOptions.find(({ id }) => id === optionId)!.value;
            onLocationChange(newLocation);
          }}
        />
      </EuiFormRow>
      {location === 'inside' && (
        <>
          <EuiFormRow
            display="columnCompressed"
            label={i18n.translate('xpack.lens.shared.legendInsideAlignmentLabel', {
              defaultMessage: 'Alignment',
            })}
          >
            <>
              <EuiButtonGroup
                legend={i18n.translate('xpack.lens.shared.legendInsideVerticalAlignmentLabel', {
                  defaultMessage: 'Vertical alignment',
                })}
                type="single"
                data-test-subj="lens-legend-inside-valign-btn"
                name="legendInsideVAlign"
                buttonSize="compressed"
                options={verticalAlignButtonsIcons}
                idSelected={verticalAlignment || VerticalAlignment.Top}
                onChange={(id) => onAlignmentChange(id, 'vertical')}
                isIconOnly
              />
              <EuiButtonGroup
                legend={i18n.translate('xpack.lens.shared.legendInsideHorizontalAlignLabel', {
                  defaultMessage: 'Horizontal alignment',
                })}
                type="single"
                data-test-subj="lens-legend-inside-halign-btn"
                name="legendInsideHAlign"
                buttonSize="compressed"
                options={horizontalAlignButtonsIcons}
                idSelected={horizontalAlignment || HorizontalAlignment.Right}
                onChange={(id) => onAlignmentChange(id, 'horizontal')}
                isIconOnly
              />
            </>
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.lens.shared.legendInsideColumnsLabel', {
              defaultMessage: 'Number of columns',
            })}
            fullWidth
            display="rowCompressed"
          >
            <FloatingColumnsSlider
              value={floatingColumns ?? DEFAULT_FLOATING_COLUMNS}
              setValue={onFloatingColumnsChange}
            />
          </EuiFormRow>
        </>
      )}
    </>
  );
};
