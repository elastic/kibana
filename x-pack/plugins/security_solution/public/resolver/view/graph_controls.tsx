/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/button-has-type */

import React, { useCallback, useMemo, useContext } from 'react';
import styled from 'styled-components';
import { EuiRange, EuiPanel, EuiIcon } from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { SideEffectContext } from './side_effect_context';
import { Vector2 } from '../types';
import * as selectors from '../store/selectors';
import { useResolverTheme } from './assets';
import { ResolverAction } from '../store/actions';

interface StyledGraphControls {
  graphControlsBackground: string;
  graphControlsIconColor: string;
}

const StyledGraphControls = styled.div<StyledGraphControls>`
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: ${(props) => props.graphControlsBackground};
  color: ${(props) => props.graphControlsIconColor};

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
/**
 * Controls for zooming, panning, and centering in Resolver
 */
const GraphControlsComponent = React.memo(
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
    const { timestamp } = useContext(SideEffectContext);
    const { colorMap } = useResolverTheme();

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

    const [handleNorth, handleEast, handleSouth, handleWest] = useMemo(() => {
      const directionVectors: readonly Vector2[] = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      return directionVectors.map((direction) => {
        return () => {
          const action: ResolverAction = {
            type: 'userNudgedCamera',
            payload: { direction, time: timestamp() },
          };
          dispatch(action);
        };
      });
    }, [dispatch, timestamp]);

    return (
      <StyledGraphControls
        className={className}
        graphControlsBackground={colorMap.graphControlsBackground}
        graphControlsIconColor={colorMap.graphControls}
      >
        <EuiPanel className="panning-controls" paddingSize="none" hasShadow>
          <div className="panning-controls-top">
            <button
              className="north-button"
              data-test-subj="north-button"
              title="North"
              onClick={handleNorth}
            >
              <EuiIcon type="arrowUp" />
            </button>
          </div>
          <div className="panning-controls-middle">
            <button
              className="west-button"
              data-test-subj="west-button"
              title="West"
              onClick={handleWest}
            >
              <EuiIcon type="arrowLeft" />
            </button>
            <button
              className="center-button"
              data-test-subj="center-button"
              title="Center"
              onClick={handleCenterClick}
            >
              <EuiIcon type="bullseye" />
            </button>
            <button
              className="east-button"
              data-test-subj="east-button"
              title="East"
              onClick={handleEast}
            >
              <EuiIcon type="arrowRight" />
            </button>
          </div>
          <div className="panning-controls-bottom">
            <button
              className="south-button"
              data-test-subj="south-button"
              title="South"
              onClick={handleSouth}
            >
              <EuiIcon type="arrowDown" />
            </button>
          </div>
        </EuiPanel>
        <EuiPanel className="zoom-controls" paddingSize="none" hasShadow>
          <button title="Zoom In" data-test-subj="zoom-in" onClick={handleZoomInClick}>
            <EuiIcon type="plusInCircle" />
          </button>
          <EuiRange
            className="zoom-slider"
            data-test-subj="zoom-slider"
            min={0}
            max={1}
            step={0.01}
            value={scalingFactor}
            onChange={handleZoomAmountChange}
          />
          <button title="Zoom Out" data-test-subj="zoom-out" onClick={handleZoomOutClick}>
            <EuiIcon type="minusInCircle" />
          </button>
        </EuiPanel>
      </StyledGraphControls>
    );
  }
);

GraphControlsComponent.displayName = 'GraphControlsComponent';

export const GraphControls = GraphControlsComponent;
