/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiText,
  EuiLink,
  EuiSpacer,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DatasourceLayerSettingsProps } from '../../types';
import type { FormBasedPrivateState } from './types';
import { isSamplingValueEnabled } from './utils';
import { TooltipWrapper } from '../../shared_components';

const samplingValues = [0.00001, 0.0001, 0.001, 0.01, 0.1, 1];
interface SamplingSliderProps {
  values: number[];
  currentValue: number | undefined;
  disabled: boolean;
  disabledReason: string;
  onChange: (value: number) => void;
  'data-test-subj'?: string;
}
/**
 * Stub for a shared component
 */
function SamplingSlider({
  values,
  currentValue,
  disabled,
  disabledReason,
  onChange,
  'data-test-subj': dataTestSubj,
}: SamplingSliderProps) {
  const { euiTheme } = useEuiTheme();
  const samplingIndex = values.findIndex((v) => v === currentValue);
  const currentSamplingIndex = samplingIndex > -1 ? samplingIndex : values.length - 1;
  return (
    <TooltipWrapper
      tooltipContent={disabledReason}
      condition={disabled}
      delay="regular"
      display="block"
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiText
            color={disabled ? euiTheme.colors.disabledText : euiTheme.colors.subduedText}
            size="xs"
          >
            <FormattedMessage
              id="xpack.lens.indexPattern.randomSampling.performanceLabel"
              defaultMessage="Performance"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiRange
            data-test-subj={dataTestSubj}
            value={currentSamplingIndex}
            disabled={disabled}
            onChange={(e) => {
              onChange(values[Number(e.currentTarget.value)]);
            }}
            showInput={false}
            showRange={false}
            showTicks
            step={1}
            min={0}
            max={values.length - 1}
            ticks={values.map((v, i) => ({
              label: `${v * 100}%`.slice(Number.isInteger(v * 100) ? 0 : 1),
              value: i,
            }))}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            color={disabled ? euiTheme.colors.disabledText : euiTheme.colors.subduedText}
            size="xs"
          >
            <FormattedMessage
              id="xpack.lens.indexPattern.randomSampling.accuracyLabel"
              defaultMessage="Accuracy"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </TooltipWrapper>
  );
}

export function LayerSettingsPanel({
  state,
  setState,
  layerId,
}: DatasourceLayerSettingsProps<FormBasedPrivateState>) {
  const { euiTheme } = useEuiTheme();
  const isSamplingValueDisabled = !isSamplingValueEnabled(state.layers[layerId]);
  const currentValue = isSamplingValueDisabled
    ? samplingValues[samplingValues.length - 1]
    : state.layers[layerId].sampling;
  return (
    <div id={layerId}>
      <EuiText
        size="s"
        css={css`
          margin-bottom: ${euiTheme.size.base};
        `}
      >
        <h4>
          {i18n.translate('xpack.lens.indexPattern.layerSettings.headingData', {
            defaultMessage: 'Data',
          })}
        </h4>
      </EuiText>
      <EuiFormRow
        display="rowCompressed"
        data-test-subj="lns-indexPattern-random-sampling-row"
        fullWidth
        helpText={
          <>
            <EuiSpacer size="s" />
            <p>
              <FormattedMessage
                id="xpack.lens.indexPattern.randomSampling.help"
                defaultMessage="Lower sampling percentages increases the performance, but lowers the accuracy. Lower sampling percentages are best for large datasets. {link}"
                values={{
                  link: (
                    <EuiLink
                      href="https://www.elastic.co/guide/en/elasticsearch/reference/master/search-aggregations-random-sampler-aggregation.html"
                      target="_blank"
                      external
                    >
                      <FormattedMessage
                        id="xpack.lens.indexPattern.randomSampling.learnMore"
                        defaultMessage="View documentation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </>
        }
        label={
          <>
            {i18n.translate('xpack.lens.indexPattern.randomSampling.label', {
              defaultMessage: 'Sampling',
            })}{' '}
            <EuiToolTip
              content={i18n.translate('xpack.lens.indexPattern.randomSampling.experimentalLabel', {
                defaultMessage: 'Technical preview',
              })}
            >
              <EuiBetaBadge
                css={css`
                  vertical-align: middle;
                `}
                iconType="beaker"
                label={i18n.translate('xpack.lens.indexPattern.randomSampling.experimentalLabel', {
                  defaultMessage: 'Technical preview',
                })}
                size="s"
              />
            </EuiToolTip>
          </>
        }
      >
        <SamplingSlider
          disabled={isSamplingValueDisabled}
          disabledReason={i18n.translate('xpack.lens.indexPattern.randomSampling.disabledMessage', {
            defaultMessage:
              'In order to select a reduced sampling percentage, you must remove any maximum or minimum functions applied on this layer.',
          })}
          values={samplingValues}
          currentValue={currentValue}
          data-test-subj="lns-indexPattern-random-sampling-slider"
          onChange={(newSamplingValue) => {
            setState({
              ...state,
              layers: {
                ...state.layers,
                [layerId]: {
                  ...state.layers[layerId],
                  sampling: newSamplingValue,
                },
              },
            });
          }}
        />
      </EuiFormRow>
    </div>
  );
}
