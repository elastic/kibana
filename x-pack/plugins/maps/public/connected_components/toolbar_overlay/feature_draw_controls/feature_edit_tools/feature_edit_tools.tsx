/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TrackApplicationView } from '../../../../../../../../src/plugins/usage_collection/public';
import { DRAW_SHAPE } from '../../../../../common/constants';
import { VectorCircleIcon } from '../../icons/vector_circle_icon';
import { VectorLineIcon } from '../../icons/vector_line_icon';
import { VectorSquareIcon } from '../../icons/vector_square_icon';

export interface ReduxStateProps {
  drawShape?: string;
}

export interface ReduxDispatchProps {
  setDrawShape: (shapeToDraw: DRAW_SHAPE | null) => void;
}

export interface OwnProps {
  pointsOnly?: boolean;
}

type Props = ReduxStateProps & ReduxDispatchProps & OwnProps;

export function FeatureEditTools(props: Props) {
  const drawLineSelected = props.drawShape === DRAW_SHAPE.LINE;
  const drawPolygonSelected = props.drawShape === DRAW_SHAPE.POLYGON;
  const drawCircleSelected = props.drawShape === DRAW_SHAPE.DISTANCE;
  const drawBBoxSelected = props.drawShape === DRAW_SHAPE.BOUNDS;
  const drawPointSelected = props.drawShape === DRAW_SHAPE.POINT;
  const deleteSelected = props.drawShape === DRAW_SHAPE.DELETE;

  function toggleDrawShape(mode: DRAW_SHAPE) {
    if (mode && props.drawShape === mode) {
      props.setDrawShape(null);
    } else {
      props.setDrawShape(mode);
    }
  }

  return (
    <TrackApplicationView viewId="featureEditTools">
      <EuiPanel
        paddingSize="none"
        className="mapToolbarOverlay__buttonGroup mapToolbarOverlay__buttonGroupAnimated"
      >
        {props.pointsOnly ? null : (
          <>
            <EuiButtonIcon
              key="line"
              size="s"
              onClick={() => toggleDrawShape(DRAW_SHAPE.LINE)}
              iconType={VectorLineIcon}
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineLabel', {
                defaultMessage: 'Draw line',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawLineTitle', {
                defaultMessage: 'Draw line',
              })}
              aria-pressed={drawLineSelected}
              isSelected={drawLineSelected}
              display={drawLineSelected ? 'fill' : 'empty'}
            />

            <EuiButtonIcon
              key="polygon"
              size="s"
              onClick={() => toggleDrawShape(DRAW_SHAPE.POLYGON)}
              iconType="node"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPolygonLabel', {
                defaultMessage: 'Draw polygon',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPolygonTitle', {
                defaultMessage: 'Draw polygon',
              })}
              aria-pressed={drawPolygonSelected}
              isSelected={drawPolygonSelected}
              display={drawPolygonSelected ? 'fill' : 'empty'}
            />
            <EuiButtonIcon
              key="circle"
              size="s"
              onClick={() => toggleDrawShape(DRAW_SHAPE.DISTANCE)}
              iconType={VectorCircleIcon}
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawCircleLabel', {
                defaultMessage: 'Draw circle',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawCircleTitle', {
                defaultMessage: 'Draw circle',
              })}
              aria-pressed={drawCircleSelected}
              isSelected={drawCircleSelected}
              display={drawCircleSelected ? 'fill' : 'empty'}
            />
            <EuiButtonIcon
              key="boundingBox"
              size="s"
              onClick={() => toggleDrawShape(DRAW_SHAPE.BOUNDS)}
              iconType={VectorSquareIcon}
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawBBoxLabel', {
                defaultMessage: 'Draw bounding box',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawBBoxTitle', {
                defaultMessage: 'Draw bounding box',
              })}
              aria-pressed={drawBBoxSelected}
              isSelected={drawBBoxSelected}
              display={drawBBoxSelected ? 'fill' : 'empty'}
            />
          </>
        )}
        <EuiButtonIcon
          key="point"
          size="s"
          onClick={() => toggleDrawShape(DRAW_SHAPE.POINT)}
          iconType="dot"
          aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPointLabel', {
            defaultMessage: 'Draw point',
          })}
          title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPointTitle', {
            defaultMessage: 'Draw point',
          })}
          aria-pressed={drawPointSelected}
          isSelected={drawPointSelected}
          display={drawPointSelected ? 'fill' : 'empty'}
        />
        <EuiButtonIcon
          key="delete"
          size="s"
          onClick={() => toggleDrawShape(DRAW_SHAPE.DELETE)}
          iconType="trash"
          aria-label={i18n.translate(
            'xpack.maps.toolbarOverlay.featureDraw.deletePointOrShapeLabel',
            {
              defaultMessage: 'Delete point or shape',
            }
          )}
          title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.deletePointOrShapeTitle', {
            defaultMessage: 'Delete point or shape',
          })}
          aria-pressed={deleteSelected}
          isSelected={deleteSelected}
          display={deleteSelected ? 'fill' : 'empty'}
        />
      </EuiPanel>
    </TrackApplicationView>
  );
}
