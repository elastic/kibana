/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { ChangeEvent, Fragment, MouseEvent } from 'react';
import {
  EuiFieldNumber,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiRange,
  EuiSuperSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DEFAULT_SIGMA } from '../../vector_style_defaults';
import { FieldMetaPopover } from './field_meta_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';
import { STEP_FUNCTION, VECTOR_STYLES } from '../../../../../../common/constants';
import { PercentilesForm } from './percentiles_form';

const DEFAULT_PERCENTILES = [50, 75, 90, 95, 99];

const easingTitle = i18n.translate('xpack.maps.styles.dataDomainOptions.easingTitle', {
  defaultMessage: `Easing between min and max`,
});

const percentilesTitle = i18n.translate('xpack.maps.styles.dataDomainOptions.percentilesTitle', {
  defaultMessage: `Percentiles`,
});

const STEP_FUNCTION_OPTIONS = [
  {
    value: STEP_FUNCTION.EASING_BETWEEN_MIN_AND_MAX,
    inputDisplay: easingTitle,
    dropdownDisplay: (
      <Fragment>
        <strong>{easingTitle}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.maps.styles.dataDomainOptions.easingDescription"
              defaultMessage="Values are fit from the data domain to the style on a linear scale"
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    value: STEP_FUNCTION.PERCENTILES,
    inputDisplay: percentilesTitle,
    dropdownDisplay: (
      <Fragment>
        <strong>{percentilesTitle}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.maps.styles.dataDomainOptions.percentilesDescription"
              defaultMessage="Use percentiles to divide style into bands, values are mapped into style bands"
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  },
];

interface Props {
  fieldMetaOptions: FieldMetaOptions;
  styleName: VECTOR_STYLES;
  onChange: (updatedOptions: unknown) => void;
  switchDisabled: boolean;
  stepFunction: STEP_FUNCTION;
}

export function OrdinalFieldMetaPopover(props: Props) {
  function onIsEnabledChange(event: EuiSwitchEvent) {
    props.onChange({
      fieldMetaOptions: {
        ...props.fieldMetaOptions,
        isEnabled: event.target.checked,
      },
    });
  }

  function onSigmaChange(event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) {
    props.onChange({
      fieldMetaOptions: {
        ...props.fieldMetaOptions,
        sigma: parseInt(event.currentTarget.value, 10),
      },
    });
  }

  function onStepFunctionChange(value: STEP_FUNCTION) {
    const updatedOptions =
      value === STEP_FUNCTION.PERCENTILES
        ? {
            stepFunction: value,
            fieldMetaOptions: {
              ...props.fieldMetaOptions,
              isEnabled: true,
              percentiles: props.fieldMetaOptions.percentiles
                ? props.fieldMetaOptions.percentiles
                : DEFAULT_PERCENTILES,
            },
          }
        : {
            stepFunction: value,
          };
    props.onChange(updatedOptions);
  }

  function renderEasingForm() {
    const sigmaInput = props.fieldMetaOptions.isEnabled ? (
      <EuiFormRow
        label={
          <EuiToolTip
            anchorClassName="eui-alignMiddle"
            content={i18n.translate('xpack.maps.styles.dataDomainOptions.sigmaTooltipContent', {
              defaultMessage: `Set sigma to a smaller value to minimize outliers by moving the min and max closer to the median.`,
            })}
          >
            <span>
              {i18n.translate('xpack.maps.styles.dataDomainOptions.sigmaLabel', {
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
    ) : null;

    return (
      <Fragment>
        <EuiFormRow display="columnCompressedSwitch">
          <>
            <EuiSwitch
              label={i18n.translate('xpack.maps.styles.dataDomainOptions.isEnabledSwitchLabel', {
                defaultMessage: 'Get min and max from data distribution',
              })}
              checked={props.fieldMetaOptions.isEnabled}
              onChange={onIsEnabledChange}
              compressed
              disabled={props.switchDisabled}
            />{' '}
            <EuiToolTip
              content={
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.maps.styles.dataDomainOptions.isEnabled.local"
                      defaultMessage={`When disabled, min and max are calculated from local data.
                      Min and max are re-calculated when layer data changes.
                      Style bands might be inconsistent as users pan, zoom, and filter the map.`}
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.maps.styles.dataDomainOptions.isEnabled.server"
                      defaultMessage={`When enabled, min and max are calculated for the entire data set.
                      Style bands are consistent as users pan, zoom, and filter the map.
                      Min and max are clamped to the standard deviation (sigma) from the median to minimize outliers.`}
                    />
                  </p>
                </EuiText>
              }
            >
              <EuiIcon type="questionInCircle" color="subdued" />
            </EuiToolTip>
          </>
        </EuiFormRow>

        {sigmaInput}
      </Fragment>
    );
  }

  function renderPercentilesForm() {
    function onPercentilesChange(percentiles: number[]) {
      props.onChange({
        fieldMetaOptions: {
          ...props.fieldMetaOptions,
          percentiles: percentiles.sort(),
        },
      });
    }

    return (
      <PercentilesForm
        initialPercentiles={
          props.fieldMetaOptions.percentiles
            ? props.fieldMetaOptions.percentiles
            : DEFAULT_PERCENTILES
        }
        onChange={onPercentilesChange}
      />
    );
  }

  return (
    <FieldMetaPopover>
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.styles.dataDomainOptions.stepFunctionLabel', {
            defaultMessage: 'Fitting',
          })}
          helpText={i18n.translate(
            'xpack.maps.styles.dataDomainOptions.stepFunctionTooltipContent',
            {
              defaultMessage: `Specify how values are fit from the data domain to the style`,
            }
          )}
        >
          <EuiSuperSelect
            options={STEP_FUNCTION_OPTIONS}
            valueOfSelected={props.stepFunction}
            onChange={onStepFunctionChange}
            itemLayoutAlign="top"
            hasDividers
          />
        </EuiFormRow>

        <EuiHorizontalRule />

        {props.stepFunction === STEP_FUNCTION.PERCENTILES
          ? renderPercentilesForm()
          : renderEasingForm()}
      </Fragment>
    </FieldMetaPopover>
  );
}
