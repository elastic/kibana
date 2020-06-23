/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DEFAULT_ICON } from '../../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getOtherCategoryLabel } from '../../style_util';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { IconSelect } from './icon_select';
import { StopInput } from '../stop_input';
import { PREFERRED_ICONS } from '../../symbol_utils';

function isDuplicateStop(targetStop, iconStops) {
  const stops = iconStops.filter(({ stop }) => {
    return targetStop === stop;
  });
  return stops.length > 1;
}

export function getFirstUnusedSymbol(symbolOptions, iconStops) {
  const firstUnusedPreferredIconId = PREFERRED_ICONS.find((iconId) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === iconId;
    });
    return !isSymbolBeingUsed;
  });

  if (firstUnusedPreferredIconId) {
    return firstUnusedPreferredIconId;
  }

  const firstUnusedSymbol = symbolOptions.find(({ value }) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === value;
    });
    return !isSymbolBeingUsed;
  });

  return firstUnusedSymbol ? firstUnusedSymbol.value : DEFAULT_ICON;
}

const DEFAULT_ICON_STOPS = [
  { stop: null, icon: PREFERRED_ICONS[0] }, //first stop is the "other" color
  { stop: '', icon: PREFERRED_ICONS[1] },
];

export function IconStops({
  field,
  getValueSuggestions,
  iconStops = DEFAULT_ICON_STOPS,
  isDarkMode,
  onChange,
  symbolOptions,
}) {
  return iconStops.map(({ stop, icon }, index) => {
    const onIconSelect = (selectedIconId) => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        icon: selectedIconId,
      };
      onChange({ customMapStops: newIconStops });
    };
    const onStopChange = (newStopValue) => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        stop: newStopValue,
      };
      onChange({
        customMapStops: newIconStops,
        isInvalid: isDuplicateStop(newStopValue, iconStops),
      });
    };
    const onAdd = () => {
      onChange({
        customMapStops: [
          ...iconStops.slice(0, index + 1),
          {
            stop: '',
            icon: getFirstUnusedSymbol(symbolOptions, iconStops),
          },
          ...iconStops.slice(index + 1),
        ],
      });
    };
    const onRemove = () => {
      onChange({
        customMapStops: [...iconStops.slice(0, index), ...iconStops.slice(index + 1)],
      });
    };

    let deleteButton;
    if (iconStops.length > 2 && index !== 0) {
      deleteButton = (
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('xpack.maps.styles.iconStops.deleteButtonAriaLabel', {
            defaultMessage: 'Delete',
          })}
          title={i18n.translate('xpack.maps.styles.iconStops.deleteButtonLabel', {
            defaultMessage: 'Delete',
          })}
          onClick={onRemove}
        />
      );
    }

    const iconStopButtons = (
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

    const errors = [];
    // TODO check for duplicate values and add error messages here

    const stopInput =
      index === 0 ? (
        <EuiFieldText
          aria-label={getOtherCategoryLabel()}
          placeholder={getOtherCategoryLabel()}
          disabled
          compressed
        />
      ) : (
        <StopInput
          key={field.getName()} // force new component instance when field changes
          field={field}
          getValueSuggestions={getValueSuggestions}
          value={stop}
          onChange={onStopChange}
        />
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
            <IconSelect
              isDarkMode={isDarkMode}
              onChange={onIconSelect}
              symbolOptions={symbolOptions}
              value={icon}
              append={iconStopButtons}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  });
}
