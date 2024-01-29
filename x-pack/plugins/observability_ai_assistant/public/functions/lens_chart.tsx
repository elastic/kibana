/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LensEmbeddableInput,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import useAsync from 'react-use/lib/useAsync';
import { LensConfig, LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function LensChart({
  layerConfig,
  chartType,
  start,
  end,
  lens,
  dataViews,
}: {
  layerConfig: any;
  chartType: LensConfig['chartType'];
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
}) {
  const embeddableInputAsync = useAsync(async () => {
    const formulaAPI = await lens.stateHelperApi();
    const configBuilder = new LensConfigBuilder(formulaAPI.formula, dataViews);
    const { title, ...rest } = layerConfig;
    return (await configBuilder.build(
      {
        chartType,
        title: title || 'chart',
        ...rest,
      },
      {
        embeddable: true,
        timeRange: {
          from: start,
          to: end,
          type: 'relative',
        },
      }
    )) as LensEmbeddableInput;
  }, [lens]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!embeddableInputAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const embeddableInput: TypedLensByValueInput =
    embeddableInputAsync.value as TypedLensByValueInput;

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensOpenInLensButton"
                iconType="lensApp"
                onClick={() => {
                  lens.navigateToPrefilledEditor(embeddableInput);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.openInLens', {
                  defaultMessage: 'Open in Lens',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="observabilityAiAssistantLensSaveButton"
                iconType="save"
                onClick={() => {
                  setIsSaveModalOpen(() => true);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...embeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={embeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
        />
      ) : null}
    </>
  );
}
