/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Fragment, MouseEvent } from 'react';
import {
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
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_SIGMA } from '../../vector_style_defaults';
import { DataMappingPopover } from './data_mapping_popover';
import { FieldMetaOptions } from '../../../../../../common/descriptor_types';
import {
  DEFAULT_PERCENTILES,
  DATA_MAPPING_FUNCTION,
  VECTOR_STYLES,
} from '../../../../../../common/constants';
import { PercentilesForm } from './percentiles_form';

const interpolateTitle = i18n.translate('xpack.maps.styles.ordinalDataMapping.interpolateTitle', {
  defaultMessage: `Interpolate between min and max`,
});

const percentilesTitle = i18n.translate('xpack.maps.styles.ordinalDataMapping.percentilesTitle', {
  defaultMessage: `Use percentiles`,
});

const DATA_MAPPING_OPTIONS = [
  {
    value: DATA_MAPPING_FUNCTION.INTERPOLATE,
    inputDisplay: interpolateTitle,
    dropdownDisplay: (
      <Fragment>
        <strong>{interpolateTitle}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.maps.styles.ordinalDataMapping.interpolateDescription"
              defaultMessage="Interpolate values from the data domain to the style on a linear scale"
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  },
  {
    value: DATA_MAPPING_FUNCTION.PERCENTILES,
    inputDisplay: percentilesTitle,
    dropdownDisplay: (
      <Fragment>
        <strong>{percentilesTitle}</strong>
        <EuiText size="s" color="subdued">
          <p className="euiTextColor--subdued">
            <FormattedMessage
              id="xpack.maps.styles.ordinalDataMapping.percentilesDescription"
              defaultMessage="Divide style into bands that map to values"
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  },
];

interface Props<DynamicOptions> {
  fieldMetaOptions: FieldMetaOptions;
  styleName: VECTOR_STYLES;
  onChange: (updatedOptions: DynamicOptions) => void;
  dataMappingFunction: DATA_MAPPING_FUNCTION;
  supportedDataMappingFunctions: DATA_MAPPING_FUNCTION[];
  supportsFieldMetaFromLocalData: boolean;
}

export function OrdinalDataMappingPopover<DynamicOptions>(props: Props<DynamicOptions>) {
  function onIsEnabledChange(event: EuiSwitchEvent) {
    // @ts-expect-error
    props.onChange({
      fieldMetaOptions: {
        ...props.fieldMetaOptions,
        isEnabled: event.target.checked,
      },
    });
  }

  function onSigmaChange(event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) {
    // @ts-expect-error
    props.onChange({
      fieldMetaOptions: {
        ...props.fieldMetaOptions,
        sigma: parseInt(event.currentTarget.value, 10),
      },
    });
  }

  function onDataMappingFunctionChange(value: DATA_MAPPING_FUNCTION) {
    const updatedOptions =
      value === DATA_MAPPING_FUNCTION.PERCENTILES
        ? {
            dataMappingFunction: value,
            fieldMetaOptions: {
              ...props.fieldMetaOptions,
              isEnabled: true,
              percentiles: props.fieldMetaOptions.percentiles
                ? props.fieldMetaOptions.percentiles
                : DEFAULT_PERCENTILES,
            },
          }
        : {
            dataMappingFunction: value,
          };
    // @ts-expect-error
    props.onChange(updatedOptions);
  }

  function renderEasingForm() {
    const sigmaInput = props.fieldMetaOptions.isEnabled ? (
      <EuiFormRow
        label={
          <EuiToolTip
            anchorClassName="eui-alignMiddle"
            content={i18n.translate('xpack.maps.styles.ordinalDataMapping.sigmaTooltipContent', {
              defaultMessage: `To de-emphasize outliers, set sigma to a smaller value. Smaller sigmas move the min and max closer to the median.`,
            })}
          >
            <span>
              {i18n.translate('xpack.maps.styles.ordinalDataMapping.sigmaLabel', {
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
              label={i18n.translate('xpack.maps.styles.ordinalDataMapping.isEnabledSwitchLabel', {
                defaultMessage: 'Get min and max from data set',
              })}
              checked={props.fieldMetaOptions.isEnabled}
              onChange={onIsEnabledChange}
              disabled={!props.supportsFieldMetaFromLocalData}
              compressed
            />{' '}
            <EuiToolTip
              content={
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.maps.styles.ordinalDataMapping.isEnabled.server"
                      defaultMessage="Calculate min and max from the entire data set. Styling is consistent when users pan, zoom, and filter. To minimize outliers, min and max are clamped to the standard deviation (sigma) from the medium."
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.maps.styles.ordinalDataMapping.isEnabled.local"
                      defaultMessage="When disabled, calculate min and max from local data and recalculate min and max when the data changes. Styling may be inconsistent when users pan, zoom, and filter."
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
      // @ts-expect-error
      props.onChange({
        fieldMetaOptions: {
          ...props.fieldMetaOptions,
          percentiles: _.uniq(percentiles.sort()),
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

  const dataMappingOptions = DATA_MAPPING_OPTIONS.filter((option) => {
    return props.supportedDataMappingFunctions.includes(option.value);
  });

  return (
    <DataMappingPopover>
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.styles.ordinalDataMapping.dataMappingLabel', {
            defaultMessage: 'Fitting',
          })}
          helpText={i18n.translate(
            'xpack.maps.styles.ordinalDataMapping.dataMappingTooltipContent',
            {
              defaultMessage: `Fit values from the data domain to the style`,
            }
          )}
        >
          <EuiSuperSelect
            options={dataMappingOptions}
            valueOfSelected={props.dataMappingFunction}
            onChange={onDataMappingFunctionChange}
            itemLayoutAlign="top"
            hasDividers
          />
        </EuiFormRow>

        <EuiHorizontalRule />

        {props.dataMappingFunction === DATA_MAPPING_FUNCTION.PERCENTILES
          ? renderPercentilesForm()
          : renderEasingForm()}
      </Fragment>
    </DataMappingPopover>
  );
}
