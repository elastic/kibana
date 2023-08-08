/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiBetaBadge, EuiLink, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RandomSamplingSlider } from '@kbn/random-sampling';
import type { DatasourceLayerSettingsProps } from '../../types';
import type { FormBasedPrivateState } from './types';
import { isSamplingValueEnabled } from './utils';
import { IgnoreGlobalFilterRowControl } from '../../shared_components/ignore_global_filter';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';

const samplingValues = [0.00001, 0.0001, 0.001, 0.01, 0.1, 1];

export function LayerSettingsPanel({
  state,
  setState,
  layerId,
}: DatasourceLayerSettingsProps<FormBasedPrivateState>) {
  const isSamplingValueDisabled = !isSamplingValueEnabled(state.layers[layerId]);
  const currentValue = isSamplingValueDisabled
    ? samplingValues[samplingValues.length - 1]
    : state.layers[layerId].sampling;

  return (
    <>
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
        <RandomSamplingSlider
          disabled={isSamplingValueDisabled}
          disabledReason={i18n.translate('xpack.lens.indexPattern.randomSampling.disabledMessage', {
            defaultMessage:
              'In order to select a reduced sampling percentage, you must remove any maximum or minimum functions applied on this layer.',
          })}
          values={samplingValues}
          currentValue={currentValue}
          data-test-subj="lns-indexPattern-random-sampling-slider"
          onChange={(newSamplingValue) => {
            if (newSamplingValue < 1) {
              trackUiCounterEvents('apply_random_sampling');
            }
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
      <IgnoreGlobalFilterRowControl
        checked={!state.layers[layerId].ignoreGlobalFilters}
        onChange={() => {
          const newLayer = {
            ...state.layers[layerId],
            ignoreGlobalFilters: !state.layers[layerId].ignoreGlobalFilters,
          };
          const newLayers = { ...state.layers };
          newLayers[layerId] = newLayer;
          trackUiCounterEvents(
            newLayer.ignoreGlobalFilters ? `ignore_global_filters` : `use_global_filters`
          );
          setState({ ...state, layers: newLayers });
        }}
      />
    </>
  );
}
