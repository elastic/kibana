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
import { GeometryFilterForm } from '../../../../components/draw_forms/geometry_filter_form/geometry_filter_form';

export interface Props {
  cancelDraw: () => void;
  drawType: string;
  updateCompletedShape: (shapeToDraw: DRAW_TYPE) => void;
  pointsOnly?: boolean;
}

export function FeatureDrawControl(props: Props) {
  const drawLineSelected = props.drawType === DRAW_TYPE.LINE;
  const drawPolygonSelected = props.drawType === DRAW_TYPE.POLYGON;
  const drawCircleSelected = props.drawType === DRAW_TYPE.DISTANCE;
  const drawBBoxSelected = props.drawType === DRAW_TYPE.BOUNDS;
  const drawPointSelected = props.drawType === DRAW_TYPE.POINT;

  return (
    <EuiPanel paddingSize="none" style={{ display: 'inline-block' }}>
      <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
        {props.pointsOnly ? null : (
          <>
            <EuiFlexItem key={'line'} grow={false}>
              <EuiPanel
                paddingSize="none"
                className={`mapToolbarOverlay__button${drawLineSelected ? '__selected' : ''}`}
              >
                <EuiButtonIcon
                  size="s"
                  onClick={() => props.updateCompletedShape(DRAW_TYPE.LINE)}
                  iconType="minus"
                  aria-label={i18n.translate(
                    'xpack.maps.toolbarOverlay.featureDraw.drawLineLabel',
                    {
                      defaultMessage: 'Draw line',
                    }
                  )}
                  title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineTitle', {
                    defaultMessage: 'Draw line',
                  })}
                  aria-pressed={drawLineSelected}
                  isSelected={drawLineSelected}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem key={'polygon'} grow={false}>
              <EuiPanel
                paddingSize="none"
                className={`mapToolbarOverlay__button${drawPolygonSelected ? '__selected' : ''}`}
              >
                <EuiButtonIcon
                  size="s"
                  onClick={() => props.updateCompletedShape(DRAW_TYPE.POLYGON)}
                  iconType="node"
                  aria-label={i18n.translate(
                    'xpack.maps.toolbarOverlay.featureDraw.drawPolygonLabel',
                    {
                      defaultMessage: 'Draw polygon',
                    }
                  )}
                  title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineTitle', {
                    defaultMessage: 'Draw polygon',
                  })}
                  aria-pressed={drawPolygonSelected}
                  isSelected={drawPolygonSelected}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem key={'circle'} grow={false}>
              <EuiPanel
                paddingSize="none"
                className={`mapToolbarOverlay__button${drawCircleSelected ? '__selected' : ''}`}
              >
                <EuiButtonIcon
                  size="s"
                  onClick={() => props.updateCompletedShape(DRAW_TYPE.DISTANCE)}
                  iconType="plusInCircle"
                  aria-label={i18n.translate(
                    'xpack.maps.toolbarOverlay.featureDraw.drawCircleLabel',
                    {
                      defaultMessage: 'Draw circle',
                    }
                  )}
                  title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawCircleTitle', {
                    defaultMessage: 'Draw circle',
                  })}
                  aria-pressed={drawCircleSelected}
                  isSelected={drawCircleSelected}
                />
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem key={'boundingBox'} grow={false}>
              <EuiPanel
                paddingSize="none"
                className={`mapToolbarOverlay__button${drawBBoxSelected ? '__selected' : ''}`}
              >
                <EuiButtonIcon
                  size="s"
                  onClick={() => props.updateCompletedShape(DRAW_TYPE.BOUNDS)}
                  iconType="stop"
                  aria-label={i18n.translate(
                    'xpack.maps.toolbarOverlay.featureDraw.drawBBoxLabel',
                    {
                      defaultMessage: 'Draw bounding box',
                    }
                  )}
                  title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawBBoxTitle', {
                    defaultMessage: 'Draw bounding box',
                  })}
                  aria-pressed={drawBBoxSelected}
                  isSelected={drawBBoxSelected}
                />
              </EuiPanel>
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem key={'point'} grow={false}>
          <EuiPanel
            paddingSize="none"
            className={`mapToolbarOverlay__button${drawPointSelected ? '__selected' : ''}`}
          >
            <EuiButtonIcon
              size="s"
              onClick={() => props.updateCompletedShape(DRAW_TYPE.POINT)}
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
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
