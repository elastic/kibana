/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent } from 'react';

import { EuiFormRow, EuiSelect, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getVectorStyleLabel, getDisabledByMessage } from '../get_vector_style_label';
import { LABEL_POSITIONS, VECTOR_STYLES } from '../../../../../../common/constants';
import { LabelPositionStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import { LabelPositionProperty } from '../../properties/label_position_property';

const options = [
  {
    value: LABEL_POSITIONS.TOP,
    text: i18n.translate('xpack.maps.styles.labelPosition.top', {
      defaultMessage: 'Top',
    }),
  },
  {
    value: LABEL_POSITIONS.CENTER,
    text: i18n.translate('xpack.maps.styles.labelPosition.center', {
      defaultMessage: 'Center',
    }),
  },
  {
    value: LABEL_POSITIONS.BOTTOM,
    text: i18n.translate('xpack.maps.styles.labelBorderSize.bottom', {
      defaultMessage: 'Bottom',
    }),
  },
];

interface Props {
  hasLabel: boolean;
  handlePropertyChange: (
    propertyName: VECTOR_STYLES,
    stylePropertyDescriptor: LabelPositionStylePropertyDescriptor
  ) => void;
  styleProperty: LabelPositionProperty;
}

export function LabelPositionEditor({ hasLabel, handlePropertyChange, styleProperty }: Props) {
  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    handlePropertyChange(styleProperty.getStyleName(), {
      options: { position: e.target.value as LABEL_POSITIONS },
    });
  }

  const disabled = !hasLabel || styleProperty.isDisabled();

  const form = (
    <EuiFormRow label={getVectorStyleLabel(VECTOR_STYLES.LABEL_POSITION)}>
      <EuiSelect
        disabled={disabled}
        options={options}
        value={disabled ? LABEL_POSITIONS.CENTER : styleProperty.getOptions().position}
        onChange={onChange}
        aria-label={i18n.translate('xpack.maps.styles.labelPositionSelect.ariaLabel', {
          defaultMessage: 'Select label position',
        })}
        compressed
      />
    </EuiFormRow>
  );

  return !disabled ? (
    form
  ) : (
    <EuiToolTip
      anchorClassName="mapStyleFormDisabledTooltip"
      content={
        !hasLabel
          ? getDisabledByMessage(VECTOR_STYLES.LABEL_TEXT)
          : styleProperty.getDisabledReason()
      }
    >
      {form}
    </EuiToolTip>
  );
}
