/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_SHAPE } from '../../../../../common/constants';
import { VectorCircleIcon } from '../../icons/vector_circle_icon';
import { VectorLineIcon } from '../../icons/vector_line_icon';
import { VectorSquareIcon } from '../../icons/vector_square_icon';

export interface ReduxStateProps {
  drawShape?: string;
}

export interface ReduxDispatchProps {
  setDrawShape: (shapeToDraw: DRAW_SHAPE) => void;
  cancelEditing: () => void;
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
                  onClick={() => props.setDrawShape(DRAW_SHAPE.LINE)}
                  iconType={VectorLineIcon}
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
                  onClick={() => props.setDrawShape(DRAW_SHAPE.POLYGON)}
                  iconType="node"
                  aria-label={i18n.translate(
                    'xpack.maps.toolbarOverlay.featureDraw.drawPolygonLabel',
                    {
                      defaultMessage: 'Draw polygon',
                    }
                  )}
                  title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.drawPolygonTitle', {
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
                  onClick={() => props.setDrawShape(DRAW_SHAPE.DISTANCE)}
                  iconType={VectorCircleIcon}
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
                  onClick={() => props.setDrawShape(DRAW_SHAPE.BOUNDS)}
                  iconType={VectorSquareIcon}
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
              onClick={() => props.setDrawShape(DRAW_SHAPE.POINT)}
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
        <EuiFlexItem key={'exit'} grow={false}>
          <EuiPanel
            paddingSize="none"
            className="mapToolbarOverlay__button mapToolbarOverlay__button__exit"
          >
            <EuiButtonIcon
              size="s"
              onClick={props.cancelEditing}
              iconType="exit"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.cancelDraw', {
                defaultMessage: 'Exit feature editing',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.cancelDrawTitle', {
                defaultMessage: 'Exit feature editing',
              })}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
