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

export interface NormalizationOptions {
  baselineScale: number;
  baselineTime: number;
  comparisonScale: number;
  comparisonTime: number;
}

export enum ComparisonMode {
  Absolute = 'absolute',
  Relative = 'relative',
}

export enum NormalizationMode {
  Scale = 'scale',
  Time = 'time',
}

interface Props {
  mode: NormalizationMode;
  options: NormalizationOptions;
  onChange: (mode: NormalizationMode, options: NormalizationOptions) => void;
}

const SCALE_LABEL = i18n.translate('xpack.profiling.normalizationMenu.scale', {
  defaultMessage: 'Scale factor',
});

const TIME_LABEL = i18n.translate('xpack.profiling.normalizationMenu.time', {
  defaultMessage: 'Time',
});

const NORMALIZE_BY_LABEL = i18n.translate('xpack.profiling.normalizationMenu.normalizeBy', {
  defaultMessage: 'Normalize by',
});

export function NormalizationMenu(props: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const theme = useEuiTheme();

  const baselineScaleFactorInputId = useGeneratedHtmlId({ prefix: 'baselineScaleFactor' });
  const comparisonScaleFactorInputId = useGeneratedHtmlId({ prefix: 'comparisonScaleFactor' });

  const [mode, setMode] = useState(props.mode);
  const [options, setOptions] = useState(props.options);

  useEffect(() => {
    setMode(props.mode);
    setOptions(props.options);
  }, [props.mode, props.options]);

  const { baseline, comparison } =
    mode === NormalizationMode.Time
      ? { comparison: options.comparisonTime, baseline: options.baselineTime }
      : { comparison: options.comparisonScale, baseline: options.baselineScale };

  return (
    <EuiPopover
      anchorPosition="downRight"
      initialFocus={`[id="${baselineScaleFactorInputId}"]`}
      button={
        <EuiFormControlLayout
          onClick={() => {
            setIsPopoverOpen((popoverOpen) => !popoverOpen);
          }}
          compressed
          prepend={NORMALIZE_BY_LABEL}
          append={
            <EuiButtonIcon
              data-test-subj="profilingNormalizationMenuButton"
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
            {props.mode === NormalizationMode.Scale ? SCALE_LABEL : TIME_LABEL}
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
                    {i18n.translate('xpack.profiling.normalizationMenu.normalizeByTimeTooltip', {
                      defaultMessage:
                        'Select Normalize by Scale factor and set your Baseline and Comparison scale factors to compare a set of machines of different sizes. For example, you can compare a deployment of 10% of machines to a deployment of 90% of machines.',
                    })}
                  </span>
                </EuiFlexItem>
                <EuiFlexItem>
                  <span>
                    {i18n.translate('xpack.profiling.normalizationMenu.normalizeByScaleTooltip', {
                      defaultMessage:
                        'Select Normalize by Time to compare a set of machines across different time periods. For example, if you compare the last hour to the last 24 hours, the shorter timeframe (1 hour) is multiplied to match the longer timeframe (24 hours).',
                    })}
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
          setMode(id as NormalizationMode);
        }}
        legend={i18n.translate('xpack.profiling.normalizationMode.selectModeLegend', {
          defaultMessage: 'Select a normalization mode for the flamegraph',
        })}
        idSelected={mode}
        options={[
          {
            id: NormalizationMode.Scale,
            label: SCALE_LABEL,
          },
          {
            id: NormalizationMode.Time,
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
      <EuiFieldNumber
        fullWidth
        prepend={<EuiFormLabel htmlFor={baselineScaleFactorInputId}>{SCALE_LABEL}</EuiFormLabel>}
        data-test-subj="profilingNormalizationMenuFieldNumber"
        id={baselineScaleFactorInputId}
        value={baseline}
        onChange={(e) => {
          if (mode === NormalizationMode.Scale) {
            setOptions((prevOptions) => ({
              ...prevOptions,
              baselineScale: e.target.valueAsNumber,
            }));
          }
        }}
        disabled={mode === NormalizationMode.Time}
      />
      <EuiSpacer size="m" />
      <EuiTitle size="xxxs">
        <h6>
          {i18n.translate('xpack.profiling.normalizationMenu.comparison', {
            defaultMessage: 'Comparison',
          })}
        </h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFieldNumber
        fullWidth
        prepend={<EuiFormLabel htmlFor={comparisonScaleFactorInputId}>{SCALE_LABEL}</EuiFormLabel>}
        data-test-subj="profilingNormalizationMenuFieldNumber"
        id={comparisonScaleFactorInputId}
        value={comparison}
        onChange={(e) => {
          if (mode === NormalizationMode.Scale) {
            setOptions((prevOptions) => ({
              ...prevOptions,
              comparisonScale: e.target.valueAsNumber,
            }));
          }
        }}
        disabled={mode === NormalizationMode.Time}
      />
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="profilingNormalizationMenuApplyChangesButton"
        onClick={() => {
          props.onChange(mode, options);
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
