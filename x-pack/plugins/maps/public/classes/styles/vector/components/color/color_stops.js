/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { removeRow, isColorInvalid } from './color_stops_utils';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { MbValidatedColorPicker } from './mb_validated_color_picker';

export const ColorStops = ({
  onChange,
  colorStops,
  isStopsInvalid,
  getStopError,
  renderStopInput,
  addNewRow,
  canDeleteStop,
  swatches,
}) => {
  function getStopInput(stop, index) {
    const onStopChange = (newStopValue) => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].stop = newStopValue;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    return {
      stopError: getStopError(stop, index),
      stopInput: renderStopInput(stop, onStopChange, index),
    };
  }

  const rows = colorStops.map((colorStop, index) => {
    const onColorChange = (color) => {
      const newColorStops = _.cloneDeep(colorStops);
      newColorStops[index].color = color;
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    const { stopError, stopInput } = getStopInput(colorStop.stop, index);

    const color = colorStop.color;

    const colorError = isColorInvalid(color)
      ? i18n.translate('xpack.maps.styles.colorStops.hexWarningLabel', {
          defaultMessage: 'Color must provide a valid hex value',
        })
      : undefined;

    const errors = [];
    if (stopError) {
      errors.push(stopError);
    }
    if (colorError) {
      errors.push(colorError);
    }

    const onAdd = () => {
      const newColorStops = addNewRow(colorStops, index);
      onChange({
        colorStops: newColorStops,
        isInvalid: isStopsInvalid(newColorStops),
      });
    };

    let deleteButton;
    if (canDeleteStop(colorStops, index)) {
      const onRemove = () => {
        const newColorStops = removeRow(colorStops, index);
        onChange({
          colorStops: newColorStops,
          isInvalid: isStopsInvalid(newColorStops),
        });
      };
      deleteButton = (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.maps.styles.colorStops.deleteButtonAriaLabel', {
            defaultMessage: 'Delete',
          })}
          title={i18n.translate('xpack.maps.styles.colorStops.deleteButtonLabel', {
            defaultMessage: 'Delete',
          })}
          onClick={onRemove}
        />
      );
    }

    const colorPickerButtons = (
      <div>
        {deleteButton}
        <EuiButtonIcon
          iconType="plusInCircle"
          color="primary"
          aria-label="Add"
          title="Add"
          onClick={onAdd}
        />
      </div>
    );
    return (
      <EuiFormRow
        key={index}
        className="mapColorStop"
        isInvalid={errors.length !== 0}
        error={errors}
        display="rowCompressed"
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false} className="mapStyleSettings__fixedBox">
            {stopInput}
          </EuiFlexItem>
          <EuiFlexItem>
            <MbValidatedColorPicker
              onChange={onColorChange}
              color={color}
              swatches={swatches}
              append={colorPickerButtons}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  });

  return <div>{rows}</div>;
};
