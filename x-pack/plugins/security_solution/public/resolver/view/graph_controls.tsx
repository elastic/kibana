/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/button-has-type */

import React, { useCallback, useMemo, useContext, useState, HTMLAttributes } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  EuiRange,
  EuiPanel,
  EuiIcon,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiIconTip,
} from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { SideEffectContext } from './side_effect_context';
import { Vector2 } from '../types';
import * as selectors from '../store/selectors';
import { ResolverAction } from '../store/actions';
import { useColors } from './use_colors';
import { StyledDescriptionList } from './panels/styles';
import { CubeForProcess } from './panels/cube_for_process';
import { GeneratedText } from './generated_text';

interface StyledGraphControls {
  graphControlsBackground: string;
  graphControlsIconColor: string;
  graphControlsBorderColor: string;
}

const StyledGraphControls = styled.div<StyledGraphControls>`
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: transparent;
  color: ${(props) => props.graphControlsIconColor};

  & .graph-controls__wrapper {
    display: flex;
    flex-direction: row;
  }

  & .graph-controls__column {
    display: flex;
    flex-direction: column;

    &:not(last-of-type) {
      margin-right: 5px;
    }
  }

  & .graph-controls__popover_buttons {
    background-color: ${(props) => props.graphControlsBackground};
    border: 1px solid ${(props) => props.graphControlsBorderColor};
    border-radius: 4px;
    width: 40px;
    height: 40px;

    &:not(last-of-type) {
      margin-bottom: 7px;
    }
  }

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

export const GraphControls = React.memo(
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
    const [activePopover, setActivePopover] = useState<null | 'schemaInfo' | 'nodesLegend'>(null);
    const colorMap = useColors();

    const closePopover = useCallback(() => setActivePopover(null), []);

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

    const sourceAndSchema = useSelector(selectors.resolverTreeSourceAndSchema);

    const schemaListItems = [
      {
        title: 'SOURCE',
        description: <GeneratedText>{sourceAndSchema?.dataSource ?? 'Unknown'}</GeneratedText>,
      },
      {
        title: 'ID',
        description: <GeneratedText>{sourceAndSchema?.schema.id ?? 'Unknown'}</GeneratedText>,
      },
      {
        title: 'EDGE',
        description: <GeneratedText>{sourceAndSchema?.schema.parent ?? 'Unknown'}</GeneratedText>,
      },
    ];

    const legendListItems = [
      {
        title: (
          <CubeForProcess
            size="2.5em"
            data-test-subj="resolver:node-detail:title-icon"
            state="running"
          />
        ),
        description: (
          <GeneratedText>
            {i18n.translate('xpack.securitySolution.resolver.graphControls.runningProcessCube', {
              defaultMessage: 'Running Process',
            })}
          </GeneratedText>
        ),
      },
      {
        title: (
          <CubeForProcess
            size="2.5em"
            data-test-subj="resolver:node-detail:title-icon"
            state="terminated"
          />
        ),
        description: (
          <GeneratedText>
            {i18n.translate('xpack.securitySolution.resolver.graphControls.terminatedProcessCube', {
              defaultMessage: 'Terminated Process',
            })}
          </GeneratedText>
        ),
      },
      {
        title: (
          <CubeForProcess
            size="2.5em"
            data-test-subj="resolver:node-detail:title-icon"
            state="loading"
          />
        ),
        description: (
          <GeneratedText>
            {i18n.translate('xpack.securitySolution.resolver.graphControls.currentlyLoadingCube', {
              defaultMessage: 'Loading Process',
            })}
          </GeneratedText>
        ),
      },
      {
        title: (
          <CubeForProcess
            size="2.5em"
            data-test-subj="resolver:node-detail:title-icon"
            state="error"
          />
        ),
        description: (
          <GeneratedText>
            {i18n.translate('xpack.securitySolution.resolver.graphControls.errorCube', {
              defaultMessage: 'Error',
            })}
          </GeneratedText>
        ),
      },
    ];

    return (
      <StyledGraphControls
        className={className}
        graphControlsBackground={colorMap.graphControlsBackground}
        graphControlsIconColor={colorMap.graphControls}
        graphControlsBorderColor={colorMap.graphControlsBorderColor}
        data-test-subj="resolver:graph-controls"
      >
        <div className="graph-controls__wrapper">
          <div className="graph-controls__column">
            <EuiPopover
              ownFocus
              onScroll={closePopover}
              repositionOnScroll={false}
              onClick={() => setActivePopover('schemaInfo')}
              button={
                <EuiButtonIcon
                  className="graph-controls__popover_buttons"
                  size="m"
                  title="Schema Info"
                  aria-label="Schema Info"
                  iconType="iInCircle"
                />
              }
              isOpen={activePopover === 'schemaInfo'}
              closePopover={closePopover}
              anchorPosition="leftCenter"
            >
              <EuiPopoverTitle>
                {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaInfoTitle', {
                  defaultMessage: 'PROCESS TREE',
                })}
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.securitySolution.resolver.graphControls.schemaInfoTooltip',
                    {
                      defaultMessage: 'These are the fields used to create the process tree',
                    }
                  )}
                  position="right"
                />
              </EuiPopoverTitle>
              <div style={{ width: '256px' }}>
                <StyledDescriptionList
                  data-test-subj="resolver:schema-info"
                  type="column"
                  align="left"
                  titleProps={
                    {
                      'data-test-subj': 'resolver:schema-info:title',
                      className: 'schema-info-desc-title',
                      style: { width: '30%' },
                      // Casting this to allow data attribute
                    } as HTMLAttributes<HTMLElement>
                  }
                  descriptionProps={
                    {
                      'data-test-subj': 'resolver:schema-info:description',
                      className: 'schema-info-description',
                      style: { width: '70%' },
                    } as HTMLAttributes<HTMLElement>
                  }
                  compressed
                  listItems={schemaListItems}
                />
              </div>
            </EuiPopover>
            <EuiPopover
              ownFocus
              button={
                <EuiButtonIcon
                  className="graph-controls__popover_buttons"
                  size="m"
                  title="Nodes Legend"
                  aria-label="Nodes Legend"
                  iconType="node"
                />
              }
              onScroll={closePopover}
              repositionOnScroll={false}
              onClick={() => setActivePopover('nodesLegend')}
              isOpen={activePopover === 'nodesLegend'}
              closePopover={closePopover}
              anchorPosition="leftCenter"
            >
              <EuiPopoverTitle>
                {i18n.translate('xpack.securitySolution.resolver.graphControls.nodeLegend', {
                  defaultMessage: 'LEGEND',
                })}
              </EuiPopoverTitle>
              <div style={{ width: '212px' }}>
                <StyledDescriptionList
                  data-test-subj="resolver:graph-controls:legend"
                  type="column"
                  align="left"
                  titleProps={
                    {
                      'data-test-subj': 'resolver:graph-controls:legend:title',
                      className: 'legend-desc-title',
                      style: { width: '20%' },
                      // Casting this to allow data attribute
                    } as HTMLAttributes<HTMLElement>
                  }
                  descriptionProps={
                    {
                      'data-test-subj': 'resolver:graph-controls:legend:description',
                      className: 'legend-description',
                      style: { width: '80%', lineHeight: '2em' }, // lineHeight to align center vertically
                    } as HTMLAttributes<HTMLElement>
                  }
                  compressed
                  listItems={legendListItems}
                />
              </div>
            </EuiPopover>
          </div>
          <div className="graph-controls__column">
            <EuiPanel className="panning-controls" paddingSize="none" hasShadow>
              <div className="panning-controls-top">
                <button
                  className="north-button"
                  data-test-subj="resolver:graph-controls:north-button"
                  title="North"
                  onClick={handleNorth}
                >
                  <EuiIcon type="arrowUp" />
                </button>
              </div>
              <div className="panning-controls-middle">
                <button
                  className="west-button"
                  data-test-subj="resolver:graph-controls:west-button"
                  title="West"
                  onClick={handleWest}
                >
                  <EuiIcon type="arrowLeft" />
                </button>
                <button
                  className="center-button"
                  data-test-subj="resolver:graph-controls:center-button"
                  title="Center"
                  onClick={handleCenterClick}
                >
                  <EuiIcon type="bullseye" />
                </button>
                <button
                  className="east-button"
                  data-test-subj="resolver:graph-controls:east-button"
                  title="East"
                  onClick={handleEast}
                >
                  <EuiIcon type="arrowRight" />
                </button>
              </div>
              <div className="panning-controls-bottom">
                <button
                  className="south-button"
                  data-test-subj="resolver:graph-controls:south-button"
                  title="South"
                  onClick={handleSouth}
                >
                  <EuiIcon type="arrowDown" />
                </button>
              </div>
            </EuiPanel>
            <EuiPanel className="zoom-controls" paddingSize="none" hasShadow>
              <button
                title="Zoom In"
                data-test-subj="resolver:graph-controls:zoom-in"
                onClick={handleZoomInClick}
              >
                <EuiIcon type="plusInCircle" />
              </button>
              <EuiRange
                className="zoom-slider"
                data-test-subj="resolver:graph-controls:zoom-slider"
                min={0}
                max={1}
                step={0.01}
                value={scalingFactor}
                onChange={handleZoomAmountChange}
              />
              <button
                title="Zoom Out"
                data-test-subj="resolver:graph-controls:zoom-out"
                onClick={handleZoomOutClick}
              >
                <EuiIcon type="minusInCircle" />
              </button>
            </EuiPanel>
          </div>
        </div>
      </StyledGraphControls>
    );
  }
);
