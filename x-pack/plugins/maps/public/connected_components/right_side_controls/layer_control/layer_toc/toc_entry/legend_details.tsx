/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useErrorTextStyle } from '@kbn/react-hooks';
import type { ILayer } from '../../../../../classes/layers/layer';

interface Props {
  inspectorAdapters: Adapters;
  layer: ILayer;
}

export function LegendDetails({ inspectorAdapters, layer }: Props) {
  const errorTextStyle = useErrorTextStyle();

  const errors = layer.getErrors(inspectorAdapters);
  if (errors.length) {
    return (
      <>
        {errors.map(({ title, body }, index) => (
          <div key={index}>
            <EuiCallOut color="danger" size="s" title={title} css={errorTextStyle}>
              {body}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        ))}
      </>
    );
  }

  const warnings = layer.getWarnings();
  return warnings.length ? (
    <>
      {warnings.map(({ title, body }, index) => (
        <div key={index}>
          <EuiCallOut color="warning" size="s" css={errorTextStyle}>
            {body}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </div>
      ))}
      {layer.renderLegendDetails()}
    </>
  ) : (
    layer.renderLegendDetails()
  );
}
