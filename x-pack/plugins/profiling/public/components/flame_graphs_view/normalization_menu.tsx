/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormLabel,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPopover,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { FlameGraphNormalizationMode } from '../../../common/flamegraph';

export type FlameGraphNormalizationOptions =
  | {
      mode: FlameGraphNormalizationMode.Scale;
      baseline: number;
      comparison: number;
    }
  | { mode: FlameGraphNormalizationMode.Time };

interface Props {
  options: FlameGraphNormalizationOptions;
  totalSeconds: number;
  comparisonTotalSeconds: number;
  onChange: (options: FlameGraphNormalizationOptions) => void;
}

const SCALE_LABEL = i18n.translate('xpack.profiling.flameGraphNormalizationMenu.scale', {
  defaultMessage: 'Scale factor',
});

const TIME_LABEL = i18n.translate('xpack.profiling.flameGraphNormalizationMenu.time', {
  defaultMessage: 'Time',
});

const NORMALIZE_BY_LABEL = i18n.translate(
  'xpack.profiling.flameGraphNormalizationMenu.normalizeBy',
  {
    defaultMessage: 'Normalize by',
  }
);

function getScaleFactorsBasedOnTime({
  totalSeconds,
  comparisonTotalSeconds,
}: {
  totalSeconds: number;
  comparisonTotalSeconds: number;
}) {
  return {
    baseline: 1,
    comparison: totalSeconds / comparisonTotalSeconds,
  };
}

export function NormalizationMenu(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const theme = useEuiTheme();

  const baselineScaleFactorInputId = useGeneratedHtmlId({ prefix: 'baselineScaleFactor' });
  const comparisonScaleFactorInputId = useGeneratedHtmlId({ prefix: 'comparisonScaleFactor' });

  const [options, setOptions] = useState(props.options);

  useEffect(() => {
    setOptions(props.options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.options.mode,
    // @ts-expect-error can't refine because ESLint will complain
    props.options.baseline,
    // @ts-expect-error can't refine because ESLint will complain
    props.options.comparison,
  ]);

  const { baseline, comparison } =
    options.mode === FlameGraphNormalizationMode.Time
      ? getScaleFactorsBasedOnTime({
          comparisonTotalSeconds: props.comparisonTotalSeconds,
          totalSeconds: props.totalSeconds,
        })
      : { comparison: options.comparison, baseline: options.baseline };

  return (
    <EuiPopover
      anchorPosition="downRight"
      initialFocus={`#${baselineScaleFactorInputId}`}
      button={
        <EuiFormControlLayout
          onClick={() => {
            setIsPopoverOpen((popoverOpen) => !popoverOpen);
          }}
          compressed
          prepend={NORMALIZE_BY_LABEL}
          append={
            <EuiButtonIcon
              iconType="arrowDown"
              aria-label={i18n.translate(
                'xpack.profiling.normalizationMenu.menuPopoverButtonAriaLabel',
                { defaultMessage: 'Open normalization menu' }
              )}
            />
          }
          css={css`
            .euiFormLabel {
              max-width: none;
            }
          `}
        >
          <EuiFlexItem
            style={{
              height: '100%',
              justifyContent: 'center',
              backgroundColor: theme.euiTheme.colors.ghost,
              padding: '0 16px',
            }}
          >
            {props.options.mode === FlameGraphNormalizationMode.Scale ? SCALE_LABEL : TIME_LABEL}
          </EuiFlexItem>
        </EuiFormControlLayout>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{NORMALIZE_BY_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <span>
                    {i18n.translate(
                      'xpack.profiling.flameGraphNormalizationMenu.normalizeByTimeTooltip',
                      {
                        defaultMessage:
                          'Select Normalize by Scale factor and set your Baseline and Comparison scale factors to compare a set of machines of different sizes. For example, you can compare a deployment of 10% of machines to a deployment of 90% of machines.',
                      }
                    )}
                  </span>
                </EuiFlexItem>
                <EuiFlexItem>
                  <span>
                    {i18n.translate(
                      'xpack.profiling.flameGraphNormalizationMenu.normalizeByScaleTooltip',
                      {
                        defaultMessage:
                          'Select Normalize by Time to compare a set of machines across different time periods. For example, if you compare the last hour to the last 24 hours, the shorter timeframe (1 hour) is multiplied to match the longer timeframe (24 hours).',
                      }
                    )}
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            position="right"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" />
      <EuiButtonGroup
        buttonSize="compressed"
        isFullWidth
        onChange={(id, value) => {
          setOptions((prevOptions) => ({
            ...prevOptions,
            ...(id === FlameGraphNormalizationMode.Time
              ? { mode: FlameGraphNormalizationMode.Time }
              : { mode: FlameGraphNormalizationMode.Scale, baseline: 1, comparison: 1 }),
          }));
        }}
        legend={i18n.translate('xpack.profiling.flameGraphNormalizationMode.selectModeLegend', {
          defaultMessage: 'Select a normalization mode for the flamegraph',
        })}
        idSelected={options.mode}
        options={[
          {
            id: FlameGraphNormalizationMode.Scale,
            label: SCALE_LABEL,
          },
          {
            id: FlameGraphNormalizationMode.Time,
            label: TIME_LABEL,
          },
        ]}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.profiling.normalizationMenu.baseline', {
            defaultMessage: 'Baseline',
          })}
        </h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormControlLayout
        fullWidth
        prepend={<EuiFormLabel htmlFor={baselineScaleFactorInputId}>{SCALE_LABEL}</EuiFormLabel>}
      >
        <EuiFieldNumber
          controlOnly
          id={baselineScaleFactorInputId}
          value={baseline}
          onChange={(e) => {
            setOptions((prevOptions) => ({ ...prevOptions, baseline: e.target.valueAsNumber }));
          }}
          disabled={options.mode === FlameGraphNormalizationMode.Time}
        />
      </EuiFormControlLayout>
      <EuiSpacer size="m" />
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.profiling.normalizationMenu.comparison', {
            defaultMessage: 'Comparison',
          })}
        </h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormControlLayout
        fullWidth
        prepend={<EuiFormLabel htmlFor={comparisonScaleFactorInputId}>{SCALE_LABEL}</EuiFormLabel>}
      >
        <EuiFieldNumber
          controlOnly
          id={comparisonScaleFactorInputId}
          value={comparison}
          onChange={(e) => {
            setOptions((prevOptions) => ({
              ...prevOptions,
              comparison: e.target.valueAsNumber,
            }));
          }}
          disabled={options.mode === FlameGraphNormalizationMode.Time}
        />
      </EuiFormControlLayout>
      <EuiSpacer size="m" />
      <EuiButton
        onClick={() => {
          props.onChange(options);
          setIsPopoverOpen(false);
        }}
        fullWidth
      >
        {i18n.translate('xpack.profiling.normalizationMenu.applyChanges', {
          defaultMessage: 'Apply changes',
        })}
      </EuiButton>
    </EuiPopover>
  );
}
