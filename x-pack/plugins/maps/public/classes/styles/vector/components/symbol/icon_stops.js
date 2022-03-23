/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CUSTOM_ICON_PREFIX_SDF, DEFAULT_ICON } from '../../../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { getOtherCategoryLabel } from '../../style_util';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { IconSelect } from './icon_select';
import { StopInput } from '../stop_input';
import { getMakiSymbol, PREFERRED_ICONS, SYMBOL_OPTIONS } from '../../symbol_utils';

function isDuplicateStop(targetStop, iconStops) {
  const stops = iconStops.filter(({ stop }) => {
    return targetStop === stop;
  });
  return stops.length > 1;
}

export function getFirstUnusedSymbol(iconStops) {
  const firstUnusedPreferredIconId = PREFERRED_ICONS.find((iconId) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === iconId;
    });
    return !isSymbolBeingUsed;
  });

  if (firstUnusedPreferredIconId) {
    return firstUnusedPreferredIconId;
  }

  const firstUnusedSymbol = SYMBOL_OPTIONS.find(({ value }) => {
    const isSymbolBeingUsed = iconStops.some(({ icon }) => {
      return icon === value;
    });
    return !isSymbolBeingUsed;
  });

  return firstUnusedSymbol ? firstUnusedSymbol.value : DEFAULT_ICON;
}

export function IconStops({
  field,
  getValueSuggestions,
  iconStops,
  onChange,
  onCustomIconsChange,
  customIcons,
}) {
  return iconStops.map(({ stop, value }, index) => {
    const { svg, label } = value.startsWith(CUSTOM_ICON_PREFIX_SDF)
      ? customIcons[value]
      : getMakiSymbol(value);
    const onIconSelect = ({ selectedIconId }) => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        value: selectedIconId,
        svg,
        label,
      };
      onChange({ customStops: newIconStops });
    };
    const onStopChange = (newStopValue) => {
      const newIconStops = [...iconStops];
      newIconStops[index] = {
        ...iconStops[index],
        stop: newStopValue,
        svg,
        label,
      };
      onChange({
        customStops: newIconStops,
        isInvalid: isDuplicateStop(newStopValue, iconStops),
      });
    };
    const onAdd = () => {
      onChange({
        customStops: [
          ...iconStops.slice(0, index + 1),
          {
            stop: '',
            value: getFirstUnusedSymbol(iconStops),
            svg,
            label,
          },
          ...iconStops.slice(index + 1),
        ],
      });
    };
    const onRemove = () => {
      onChange({
        customStops: [...iconStops.slice(0, index), ...iconStops.slice(index + 1)],
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
              onCustomIconsChange={onCustomIconsChange}
              customIcons={customIcons}
              onChange={onIconSelect}
              icon={{ value, svg, label }}
              append={iconStopButtons}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  });
}
