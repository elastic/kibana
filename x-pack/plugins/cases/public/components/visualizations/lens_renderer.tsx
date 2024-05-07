/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Global, css } from '@emotion/react';

import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { useKibana } from '../../common/lib/kibana';
import type { LensProps } from './types';

const LENS_VISUALIZATION_HEIGHT = 200;

const LensRendererComponent: React.FC<LensProps> = ({ attributes, timeRange, metadata }) => {
  const {
    lens: { EmbeddableComponent },
  } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  if (!attributes) {
    return null;
  }

  return (
    <>
      {metadata && metadata.description && (
        <>
          {metadata.description}
          <EuiSpacer size="s" />
        </>
      )}
      <div
        css={css`
          min-height: ${LENS_VISUALIZATION_HEIGHT}px;
        `}
      >
        <EmbeddableComponent
          id=""
          style={{ height: LENS_VISUALIZATION_HEIGHT }}
          timeRange={timeRange}
          attributes={attributes}
          renderMode="view"
          disableTriggers
          executionContext={{
            type: 'cases',
          }}
          syncTooltips={false}
          syncCursor={false}
        />
        {/* when displaying chart in modal the tooltip is render under the modal */}
        <Global
          styles={css`
            div.euiOverlayMask[data-relative-to-header='above'] ~ [id^='echTooltipPortal'] {
              z-index: ${euiTheme.levels.modal} !important;
            }
          `}
        />
      </div>
    </>
  );
};

LensRendererComponent.displayName = 'LensRenderer';

export const LensRenderer = React.memo(LensRendererComponent);
