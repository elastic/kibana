/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EuiRange, EuiPanel, EuiIcon } from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { ResolverAction, PanDirection } from '../types';
import * as selectors from '../store/selectors';

/**
 * Controls for zooming, panning, and centering in Resolver
 */
export const GraphControls = styled(
  React.memo(
    ({
      className,
    }: {
      /**
       * A className string provided by `styled`
       */
      className?: string;
    }) => {
      const dispatch: (action: ResolverAction) => unknown = useDispatch();
      const scalingFactor = useSelector(selectors.scalingFactor);

      const handleZoomAmountChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
          const valueAsNumber = parseFloat(
            (event as React.ChangeEvent<HTMLInputElement>).target.value
          );
          if (isNaN(valueAsNumber) === false) {
            dispatch({
              type: 'userSetZoomLevel',
              payload: valueAsNumber,
            });
          }
        },
        [dispatch]
      );

      const handleCenterClick = useCallback(() => {
        dispatch({
          type: 'userSetPositionOfCamera',
          payload: [0, 0],
        });
      }, [dispatch]);

      const handleZoomOutClick = useCallback(() => {
        dispatch({
          type: 'userClickedZoomOut',
        });
      }, [dispatch]);

      const handleZoomInClick = useCallback(() => {
        dispatch({
          type: 'userClickedZoomIn',
        });
      }, [dispatch]);

      const handlePanClick = (panDirection: PanDirection) => {
        return () => {
          dispatch({
            type: 'userClickedPanControl',
            payload: panDirection,
          });
        };
      };

      return (
        <div className={className}>
          <EuiPanel className="panning-controls" paddingSize="none" hasShadow>
            <div className="panning-controls-top">
              <button className="north-button" title="North" onClick={handlePanClick('north')}>
                <EuiIcon type="arrowUp" />
              </button>
            </div>
            <div className="panning-controls-middle">
              <button className="west-button" title="West" onClick={handlePanClick('west')}>
                <EuiIcon type="arrowLeft" />
              </button>
              <button className="center-button" title="Center" onClick={handleCenterClick}>
                <EuiIcon type="bullseye" />
              </button>
              <button className="east-button" title="East" onClick={handlePanClick('east')}>
                <EuiIcon type="arrowRight" />
              </button>
            </div>
            <div className="panning-controls-bottom">
              <button className="south-button" title="South" onClick={handlePanClick('south')}>
                <EuiIcon type="arrowDown" />
              </button>
            </div>
          </EuiPanel>
          <EuiPanel className="zoom-controls" paddingSize="none" hasShadow>
            <button title="Zoom In" onClick={handleZoomInClick}>
              <EuiIcon type="plusInCircle" />
            </button>
            <EuiRange
              className="zoom-slider"
              min={0}
              max={1}
              step={0.01}
              value={scalingFactor}
              onChange={handleZoomAmountChange}
            />
            <button title="Zoom Out" onClick={handleZoomOutClick}>
              <EuiIcon type="minusInCircle" />
            </button>
          </EuiPanel>
        </div>
      );
    }
  )
)`
  position: absolute;
  top: 5px;
  left: 5px;
  z-index: 1;
  background-color: #d4d4d4;
  color: #333333;

  .zoom-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 0px;

    .zoom-slider {
      width: 20px;
      height: 150px;
      margin: 5px 0px 2px 0px;

      input[type='range'] {
        width: 150px;
        height: 20px;
        transform-origin: 75px 75px;
        transform: rotate(-90deg);
      }
    }
  }
  .panning-controls {
    text-align: center;
  }
`;
