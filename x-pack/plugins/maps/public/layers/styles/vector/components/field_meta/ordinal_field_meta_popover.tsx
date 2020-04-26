/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import _ from 'lodash';
import React, { ChangeEvent, Fragment, MouseEvent } from 'react';
import { EuiFormRow, EuiRange, EuiSwitch, EuiSwitchEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SIGMA } from '../../vector_style_defaults';
import { FieldMetaPopover } from './field_meta_popover';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';

function getIsEnableToggleLabel(styleName: string) {
  switch (styleName) {
    case VECTOR_STYLES.FILL_COLOR:
    case VECTOR_STYLES.LINE_COLOR:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.colorLabel', {
        defaultMessage: 'Calculate color ramp range from indices',
      });
    case VECTOR_STYLES.LINE_WIDTH:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.widthLabel', {
        defaultMessage: 'Calculate border width range from indices',
      });
    case VECTOR_STYLES.ICON_SIZE:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.sizeLabel', {
        defaultMessage: 'Calculate symbol size range from indices',
      });
    default:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.defaultLabel', {
        defaultMessage: 'Calculate symbolization range from indices',
      });
  }
}

type Props = {
  styleProperty: IDynamicStyleProperty;
  onChange: (fieldMetaOptions: FieldMetaOptions) => void;
};

export function OrdinalFieldMetaPopover(props: Props) {
  const onIsEnabledChange = (event: EuiSwitchEvent) => {
    props.onChange({
      ...props.styleProperty.getFieldMetaOptions(),
      isEnabled: event.target.checked,
    });
  };

  const onSigmaChange = (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    props.onChange({
      ...props.styleProperty.getFieldMetaOptions(),
      sigma: parseInt(event.currentTarget.value, 10),
    });
  };

  return (
    <FieldMetaPopover>
      <Fragment>
        <EuiFormRow display="columnCompressedSwitch">
          <EuiSwitch
            label={getIsEnableToggleLabel(props.styleProperty.getStyleName())}
            checked={props.styleProperty.getFieldMetaOptions().isEnabled}
            onChange={onIsEnabledChange}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.styles.fieldMetaOptions.sigmaLabel', {
            defaultMessage: 'Sigma',
          })}
          display="columnCompressed"
        >
          <EuiRange
            min={1}
            max={5}
            step={0.25}
            value={_.get(props.styleProperty.getFieldMetaOptions(), 'sigma', DEFAULT_SIGMA)}
            onChange={onSigmaChange}
            disabled={!props.styleProperty.getFieldMetaOptions().isEnabled}
            showTicks
            tickInterval={1}
            compressed
          />
        </EuiFormRow>
      </Fragment>
    </FieldMetaPopover>
  );
}
