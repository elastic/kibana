/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';
import { VerticalAlignment, HorizontalAlignment, Position } from '@elastic/charts';

export interface LegendLocationSettingsProps {
  /**
   * Sets the legend position
   */
  position?: Position;
  /**
   * Callback on position option change
   */
  onPositionChange: (id: string) => void;
  /**
   * Determines the legend location
   */
  location?: 'inside' | 'outside';
  /**
   * Callback on location option change
   */
  onLocationChange?: (id: string) => void;
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
  onAlignmentChange?: (id: string) => void;
  /**
   * Flag to disable the location settings
   */
  isDisabled?: boolean;
}

const toggleButtonsIcons = [
  {
    id: Position.Top,
    label: i18n.translate('xpack.lens.shared.legendPositionTop', {
      defaultMessage: 'Top',
    }),
    iconType: 'arrowUp',
  },
  {
    id: Position.Right,
    label: i18n.translate('xpack.lens.shared.legendPositionRight', {
      defaultMessage: 'Right',
    }),
    iconType: 'arrowRight',
  },
  {
    id: Position.Bottom,
    label: i18n.translate('xpack.lens.shared.legendPositionBottom', {
      defaultMessage: 'Bottom',
    }),
    iconType: 'arrowDown',
  },
  {
    id: Position.Left,
    label: i18n.translate('xpack.lens.shared.legendPositionLeft', {
      defaultMessage: 'Left',
    }),
    iconType: 'arrowLeft',
  },
];

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

const locationAlignmentButtonsIcons: Array<{
  id: string;
  value: 'bottom_left' | 'bottom_right' | 'top_left' | 'top_right';
  label: string;
  iconType: string;
}> = [
  {
    id: 'xy_location_alignment_top_right',
    value: 'top_right',
    label: i18n.translate('xpack.lens.shared.legendLocationTopRight', {
      defaultMessage: 'Top right',
    }),
    iconType: 'editorPositionTopRight',
  },
  {
    id: 'xy_location_alignment_top_left',
    value: 'top_left',
    label: i18n.translate('xpack.lens.shared.legendLocationTopLeft', {
      defaultMessage: 'Top left',
    }),
    iconType: 'editorPositionTopLeft',
  },
  {
    id: 'xy_location_alignment_bottom_right',
    value: 'bottom_right',
    label: i18n.translate('xpack.lens.shared.legendLocationBottomRight', {
      defaultMessage: 'Bottom right',
    }),
    iconType: 'editorPositionBottomRight',
  },
  {
    id: 'xy_location_alignment_bottom_left',
    value: 'bottom_left',
    label: i18n.translate('xpack.lens.shared.legendLocationBottomLeft', {
      defaultMessage: 'Bottom left',
    }),
    iconType: 'editorPositionBottomLeft',
  },
];

export const LegendLocationSettings: React.FunctionComponent<LegendLocationSettingsProps> = ({
  location,
  onLocationChange = () => {},
  position,
  onPositionChange,
  verticalAlignment,
  horizontalAlignment,
  onAlignmentChange = () => {},
  isDisabled = false,
}) => {
  const alignment = `${verticalAlignment || VerticalAlignment.Top}_${
    horizontalAlignment || HorizontalAlignment.Right
  }`;
  if (isDisabled) return null;
  return (
    <>
      {location && (
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
            isDisabled={isDisabled}
            idSelected={locationOptions.find(({ value }) => value === location)!.id}
            onChange={(optionId) => {
              const newLocation = locationOptions.find(({ id }) => id === optionId)!.value;
              onLocationChange(newLocation);
            }}
          />
        </EuiFormRow>
      )}
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.legendInsideAlignmentLabel', {
          defaultMessage: 'Alignment',
        })}
      >
        <>
          {(!location || location === 'outside') && (
            <EuiButtonGroup
              legend={i18n.translate('xpack.lens.shared.legendAlignmentLabel', {
                defaultMessage: 'Alignment',
              })}
              isDisabled={isDisabled}
              data-test-subj="lens-legend-position-btn"
              name="legendPosition"
              buttonSize="compressed"
              options={toggleButtonsIcons}
              idSelected={position || Position.Right}
              onChange={onPositionChange}
              isIconOnly
            />
          )}
          {location === 'inside' && (
            <EuiButtonGroup
              legend={i18n.translate('xpack.lens.shared.legendInsideLocationAlignmentLabel', {
                defaultMessage: 'Alignment',
              })}
              type="single"
              data-test-subj="lens-legend-inside-alignment-btn"
              name="legendInsideAlignment"
              buttonSize="compressed"
              isDisabled={isDisabled}
              options={locationAlignmentButtonsIcons}
              idSelected={
                locationAlignmentButtonsIcons.find(({ value }) => value === alignment)!.id
              }
              onChange={(optionId) => {
                const newAlignment = locationAlignmentButtonsIcons.find(
                  ({ id }) => id === optionId
                )!.value;
                onAlignmentChange(newAlignment);
              }}
              isIconOnly
            />
          )}
        </>
      </EuiFormRow>
    </>
  );
};
