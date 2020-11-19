/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import _ from 'lodash';
import React, { ChangeEvent, Fragment, MouseEvent } from 'react';
import { EuiFormRow, EuiIcon, EuiRange, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_SIGMA } from '../../vector_style_defaults';
import { FieldMetaPopover } from './field_meta_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';

/* function getStepFunctionSelect(styleName: VECTOR_STYLES) {
  switch (styleName) {
    case VECTOR_STYLES.FILL_COLOR:
    case VECTOR_STYLES.LINE_COLOR:
    case VECTOR_STYLES.LINE_WIDTH:
    case VECTOR_STYLES.ICON_SIZE:
      return i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabled.sizeLabel', {
        defaultMessage: 'Calculate symbol size range from indices',
      });
    default:
      return null;
  }
}*/

type Props = {
  fieldMetaOptions: FieldMetaOptions;
  styleName: VECTOR_STYLES;
  onChange: (fieldMetaOptions: FieldMetaOptions) => void;
  switchDisabled: boolean;
};

export function OrdinalFieldMetaPopover(props: Props) {
  const onIsEnabledChange = (event: EuiSwitchEvent) => {
    props.onChange({
      ...props.fieldMetaOptions,
      isEnabled: event.target.checked,
    });
  };

  const onSigmaChange = (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    props.onChange({
      ...props.fieldMetaOptions,
      sigma: parseInt(event.currentTarget.value, 10),
    });
  };

  function renderSigmaInput() {
    if (!props.fieldMetaOptions.isEnabled) {
      return null;
    }

    return (
      <EuiFormRow
        label={
          <EuiToolTip
            anchorClassName="eui-alignMiddle"
            content={i18n.translate('xpack.maps.styles.fieldMetaOptions.sigmaTooltipContent', {
              defaultMessage: `The min and max from elasticsearch are clamped to a standard deviation range from the median.
              Set Sigma to a smaller value to minimize outliers by moving the min and max closer to the median.`,
            })}
          >
            <span>
              {i18n.translate('xpack.maps.styles.fieldMetaOptions.sigmaLabel', {
                defaultMessage: 'Sigma',
              })}{' '}
              <EuiIcon type="questionInCircle" color="subdued" />
            </span>
          </EuiToolTip>
        }
        display="columnCompressed"
      >
        <EuiRange
          min={1}
          max={5}
          step={0.25}
          value={_.get(props.fieldMetaOptions, 'sigma', DEFAULT_SIGMA)}
          onChange={onSigmaChange}
          showTicks
          tickInterval={1}
          compressed
        />
      </EuiFormRow>
    );
  }

  return (
    <FieldMetaPopover>
      <Fragment>
        <EuiFormRow display="columnCompressedSwitch">
          <>
            <EuiSwitch
              label={i18n.translate('xpack.maps.styles.fieldMetaOptions.isEnabledSwitchLabel', {
                defaultMessage: 'Get min and max from elasticsearch',
              })}
              checked={props.fieldMetaOptions.isEnabled}
              onChange={onIsEnabledChange}
              compressed
              disabled={props.switchDisabled}
            />{' '}
            <EuiToolTip
              content={i18n.translate(
                'xpack.maps.styles.fieldMetaOptions.isEnabledTooltipContent',
                {
                  defaultMessage: `When disabled, min and max are calculated with data from the local layer.
                The min and max are re-calculated when layer data changes.
                As a result, styling bands might be inconsistent as users pan, zoom, and filter the map.`,
                }
              )}
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        </EuiFormRow>

        {renderSigmaInput()}
      </Fragment>
    </FieldMetaPopover>
  );
}
