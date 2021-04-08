/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../../common/constants';
// @ts-expect-error
import { GeometryFilterForm } from '../../../../components/geometry_filter_form';

export interface Props {
  cancelDraw: () => void;
  drawType: string;
  initiateDraw: (drawFeatureState: DRAW_TYPE) => void;
}

export function FeatureDrawControl(props: Props) {
  const drawLineSelected = props.drawType === DRAW_TYPE.LINE;
  const drawPolygonSelected = props.drawType === DRAW_TYPE.POLYGON;
  const drawBBoxSelected = props.drawType === DRAW_TYPE.BOUNDS;
  const drawPointSelected = props.drawType === DRAW_TYPE.POINT;

  return (
    <EuiPanel paddingSize="none" style={{ display: 'inline-block' }}>
      <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
        <EuiFlexItem key={'line'} grow={false}>
          <EuiButtonIcon
            className={`mapToolbarOverlay__button${drawLineSelected ? '__selected' : ''}`}
            onClick={() => props.initiateDraw(DRAW_TYPE.LINE)}
            iconType="minus"
            aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineLabel', {
              defaultMessage: 'Draw line',
            })}
            title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineTitle', {
              defaultMessage: 'Draw line',
            })}
            aria-pressed={drawLineSelected}
            isSelected={drawLineSelected}
          />
        </EuiFlexItem>
        <EuiFlexItem key={'polygon'} grow={false}>
          <EuiButtonIcon
            className={`mapToolbarOverlay__button${drawPolygonSelected ? '__selected' : ''}`}
            onClick={() => props.initiateDraw(DRAW_TYPE.POLYGON)}
            iconType="home"
            aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPolygonLabel', {
              defaultMessage: 'Draw polygon',
            })}
            title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineTitle', {
              defaultMessage: 'Draw polygon',
            })}
            aria-pressed={drawPolygonSelected}
            isSelected={drawPolygonSelected}
          />
        </EuiFlexItem>
        <EuiFlexItem key={'boundingBox'} grow={false}>
          <EuiButtonIcon
            className={`mapToolbarOverlay__button${drawBBoxSelected ? '__selected' : ''}`}
            onClick={() => props.initiateDraw(DRAW_TYPE.BOUNDS)}
            iconType="stop"
            aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawBBoxLabel', {
              defaultMessage: 'Draw bounding box',
            })}
            title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawBBoxTitle', {
              defaultMessage: 'Draw bounding box',
            })}
            aria-pressed={drawBBoxSelected}
            isSelected={drawBBoxSelected}
          />
        </EuiFlexItem>
        <EuiFlexItem key={'point'} grow={false}>
          <EuiButtonIcon
            className={`mapToolbarOverlay__button${drawPointSelected ? '__selected' : ''}`}
            onClick={() => props.initiateDraw(DRAW_TYPE.POINT)}
            iconType="dot"
            aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPointLabel', {
              defaultMessage: 'Draw point',
            })}
            title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPointTitle', {
              defaultMessage: 'Draw point',
            })}
            aria-pressed={drawPointSelected}
            isSelected={drawPointSelected}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
