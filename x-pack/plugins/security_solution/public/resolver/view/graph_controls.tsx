/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useContext, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import type { EuiRangeProps } from '@elastic/eui';
import {
  EuiRange,
  EuiPanel,
  EuiIcon,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiIconTip,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { SideEffectContext } from './side_effect_context';
import type { Vector2 } from '../types';
import * as selectors from '../store/selectors';
import { useColors } from './use_colors';
import { StyledDescriptionList } from './panels/styles';
import { CubeForProcess } from './panels/cube_for_process';
import { GeneratedText } from './generated_text';
import {
  userClickedZoomIn,
  userClickedZoomOut,
  userSetZoomLevel,
  userNudgedCamera,
  userSetPositionOfCamera,
} from '../store/camera/action';
import type { State } from '../../common/store/types';

// EuiRange is currently only horizontally positioned. This reorients the track to a vertical position
const StyledEuiRange = styled(EuiRange)<EuiRangeProps>`
  & .euiRangeTrack:after {
    left: -65px;
    transform: rotate(90deg);
  }
`;
interface StyledGraphControlProps {
  $backgroundColor: string;
  $iconColor: string;
  $borderColor: string;
}

const StyledGraphControlsColumn = styled.div`
  display: flex;
  flex-direction: column;

  &:not(last-of-type) {
    margin-right: 5px;
  }
`;

const COLUMN_WIDTH = ['fit-content(10em)', 'auto'];

const StyledEuiDescriptionListTitle = styled(EuiDescriptionListTitle)`
  text-transform: uppercase;
`;

const StyledEuiDescriptionListDescription = styled(EuiDescriptionListDescription)`
  lineheight: '2.2em'; // lineHeight to align center vertically
`;

const StyledEuiButtonIcon = styled(EuiButtonIcon)<StyledGraphControlProps>`
  background-color: ${(props) => props.$backgroundColor};
  color: ${(props) => props.$iconColor};
  border-color: ${(props) => props.$borderColor};
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  width: 40px;
  height: 40px;

  &:not(last-of-type) {
    margin-bottom: 7px;
  }
`;

const StyledGraphControls = styled.div<Partial<StyledGraphControlProps>>`
  display: flex;
  flex-direction: row;
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: transparent;
  color: ${(props) => props.$iconColor};

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

// eslint-disable-next-line react/display-name
export const GraphControls = React.memo(
  ({
    id,
    className,
  }: {
    /**
     * Id that identify the scope of analyzer
     */
    id: string;
    /**
     * A className string provided by `styled`
     */
    className?: string;
  }) => {
    const dispatch = useDispatch();
    const scalingFactor = useSelector((state: State) =>
      selectors.scalingFactor(state.analyzer[id])
    );
    const { timestamp } = useContext(SideEffectContext);
    const [activePopover, setPopover] = useState<null | 'schemaInfo' | 'nodeLegend'>(null);
    const colorMap = useColors();

    const setActivePopover = useCallback(
      (value) => {
        if (value === activePopover) {
          setPopover(null);
        } else {
          setPopover(value);
        }
      },
      [setPopover, activePopover]
    );

    const closePopover = useCallback(() => setPopover(null), []);

    const handleZoomAmountChange: EuiRangeProps['onChange'] = useCallback(
      (event) => {
        const valueAsNumber = parseFloat(
          (event as React.ChangeEvent<HTMLInputElement>).target.value
        );
        if (isNaN(valueAsNumber) === false) {
          dispatch(
            userSetZoomLevel({
              id,
              zoomLevel: valueAsNumber,
            })
          );
        }
      },
      [dispatch, id]
    );

    const handleCenterClick = useCallback(() => {
      dispatch(userSetPositionOfCamera({ id, cameraView: [0, 0] }));
    }, [dispatch, id]);

    const handleZoomOutClick = useCallback(() => {
      dispatch(userClickedZoomOut({ id }));
    }, [dispatch, id]);

    const handleZoomInClick = useCallback(() => {
      dispatch(userClickedZoomIn({ id }));
    }, [dispatch, id]);

    const [handleNorth, handleEast, handleSouth, handleWest] = useMemo(() => {
      const directionVectors: readonly Vector2[] = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      return directionVectors.map((direction) => {
        return () => {
          dispatch(userNudgedCamera({ id, direction, time: timestamp() }));
        };
      });
    }, [dispatch, timestamp, id]);

    /* eslint-disable react/button-has-type */
    return (
      <StyledGraphControls
        className={className}
        $iconColor={colorMap.graphControls}
        data-test-subj="resolver:graph-controls"
      >
        <StyledGraphControlsColumn>
          <SchemaInformation
            id={id}
            closePopover={closePopover}
            isOpen={activePopover === 'schemaInfo'}
            setActivePopover={setActivePopover}
          />
          <NodeLegend
            id={id}
            closePopover={closePopover}
            isOpen={activePopover === 'nodeLegend'}
            setActivePopover={setActivePopover}
          />
        </StyledGraphControlsColumn>
        <StyledGraphControlsColumn>
          <EuiPanel className="panning-controls" paddingSize="none" hasBorder>
            <div className="panning-controls-top">
              <button
                className="north-button"
                data-test-subj="resolver:graph-controls:north-button"
                title={i18n.translate('xpack.securitySolution.resolver.graphControls.north', {
                  defaultMessage: 'North',
                })}
                onClick={handleNorth}
              >
                <EuiIcon type="arrowUp" />
              </button>
            </div>
            <div className="panning-controls-middle">
              <button
                className="west-button"
                data-test-subj="resolver:graph-controls:west-button"
                title={i18n.translate('xpack.securitySolution.resolver.graphControls.west', {
                  defaultMessage: 'West',
                })}
                onClick={handleWest}
              >
                <EuiIcon type="arrowLeft" />
              </button>
              <button
                className="center-button"
                data-test-subj="resolver:graph-controls:center-button"
                title={i18n.translate('xpack.securitySolution.resolver.graphControls.center', {
                  defaultMessage: 'Center',
                })}
                onClick={handleCenterClick}
              >
                <EuiIcon type="bullseye" />
              </button>
              <button
                className="east-button"
                data-test-subj="resolver:graph-controls:east-button"
                title={i18n.translate('xpack.securitySolution.resolver.graphControls.east', {
                  defaultMessage: 'East',
                })}
                onClick={handleEast}
              >
                <EuiIcon type="arrowRight" />
              </button>
            </div>
            <div className="panning-controls-bottom">
              <button
                className="south-button"
                data-test-subj="resolver:graph-controls:south-button"
                title={i18n.translate('xpack.securitySolution.resolver.graphControls.south', {
                  defaultMessage: 'South',
                })}
                onClick={handleSouth}
              >
                <EuiIcon type="arrowDown" />
              </button>
            </div>
          </EuiPanel>
          <EuiPanel className="zoom-controls" paddingSize="none" hasBorder>
            <button
              title={i18n.translate('xpack.securitySolution.resolver.graphControls.zoomIn', {
                defaultMessage: 'Zoom In',
              })}
              data-test-subj="resolver:graph-controls:zoom-in"
              onClick={handleZoomInClick}
            >
              <EuiIcon type="plusInCircle" />
            </button>
            <StyledEuiRange
              className="zoom-slider"
              data-test-subj="resolver:graph-controls:zoom-slider"
              min={0}
              max={1}
              step={0.01}
              value={scalingFactor}
              onChange={handleZoomAmountChange}
            />
            <button
              title={i18n.translate('xpack.securitySolution.resolver.graphControls.zoomOut', {
                defaultMessage: 'Zoom Out',
              })}
              data-test-subj="resolver:graph-controls:zoom-out"
              onClick={handleZoomOutClick}
            >
              <EuiIcon type="minusInCircle" />
            </button>
          </EuiPanel>
        </StyledGraphControlsColumn>
      </StyledGraphControls>
    );
    /* eslint-enable react/button-has-type */
  }
);

const SchemaInformation = ({
  id,
  closePopover,
  setActivePopover,
  isOpen,
}: {
  id: string;
  closePopover: () => void;
  setActivePopover: (value: 'schemaInfo' | null) => void;
  isOpen: boolean;
}) => {
  const colorMap = useColors();
  const sourceAndSchema = useSelector((state: State) =>
    selectors.resolverTreeSourceAndSchema(state.analyzer[id])
  );
  const setAsActivePopover = useCallback(() => setActivePopover('schemaInfo'), [setActivePopover]);

  const schemaInfoButtonTitle = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.schemaInfoButtonTitle',
    {
      defaultMessage: 'Schema Information',
    }
  );

  const unknownSchemaValue = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.unknownSchemaValue',
    {
      defaultMessage: 'Unknown',
    }
  );

  return (
    <EuiPopover
      button={
        <StyledEuiButtonIcon
          data-test-subj="resolver:graph-controls:schema-info-button"
          size="m"
          title={schemaInfoButtonTitle}
          aria-label={schemaInfoButtonTitle}
          onClick={setAsActivePopover}
          iconType="iInCircle"
          $backgroundColor={colorMap.graphControlsBackground}
          $iconColor={colorMap.graphControls}
          $borderColor={colorMap.graphControlsBorderColor}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle style={{ textTransform: 'uppercase' }}>
        {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaInfoTitle', {
          defaultMessage: 'process tree',
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
      <div
        // Limit the width based on UX design
        style={{ maxWidth: '268px' }}
      >
        <StyledDescriptionList
          data-test-subj="resolver:graph-controls:schema-info"
          type="column"
          columnWidths={COLUMN_WIDTH}
          align="left"
          compressed
        >
          <>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaSource', {
                defaultMessage: 'source',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.dataSource ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaID', {
                defaultMessage: 'id',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.schema.id ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:schema-info:title">
              {i18n.translate('xpack.securitySolution.resolver.graphControls.schemaEdge', {
                defaultMessage: 'edge',
              })}
            </StyledEuiDescriptionListTitle>
            <EuiDescriptionListDescription data-test-subj="resolver:graph-controls:schema-info:description">
              <GeneratedText>{sourceAndSchema?.schema.parent ?? unknownSchemaValue}</GeneratedText>
            </EuiDescriptionListDescription>
          </>
        </StyledDescriptionList>
      </div>
    </EuiPopover>
  );
};

// This component defines the cube legend that allows users to identify the meaning of the cubes
// Should be updated to be dynamic if and when non process based resolvers are possible
const NodeLegend = ({
  id,
  closePopover,
  setActivePopover,
  isOpen,
}: {
  id: string;
  closePopover: () => void;
  setActivePopover: (value: 'nodeLegend') => void;
  isOpen: boolean;
}) => {
  const setAsActivePopover = useCallback(() => setActivePopover('nodeLegend'), [setActivePopover]);
  const colorMap = useColors();

  const nodeLegendButtonTitle = i18n.translate(
    'xpack.securitySolution.resolver.graphControls.nodeLegendButtonTitle',
    {
      defaultMessage: 'Node Legend',
    }
  );

  return (
    <EuiPopover
      button={
        <StyledEuiButtonIcon
          data-test-subj="resolver:graph-controls:node-legend-button"
          size="m"
          title={nodeLegendButtonTitle}
          aria-label={nodeLegendButtonTitle}
          onClick={setAsActivePopover}
          iconType="node"
          $backgroundColor={colorMap.graphControlsBackground}
          $iconColor={colorMap.graphControls}
          $borderColor={colorMap.graphControlsBorderColor}
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="leftCenter"
    >
      <EuiPopoverTitle style={{ textTransform: 'uppercase' }}>
        {i18n.translate('xpack.securitySolution.resolver.graphControls.nodeLegend', {
          defaultMessage: 'legend',
        })}
      </EuiPopoverTitle>
      <div
        // Limit the width based on UX design
        style={{ maxWidth: '212px' }}
      >
        <StyledDescriptionList
          data-test-subj="resolver:graph-controls:node-legend"
          type="column"
          columnWidths={COLUMN_WIDTH}
          align="left"
          compressed
        >
          <>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="running"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.runningProcessCube',
                  {
                    defaultMessage: 'Running Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="terminated"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.terminatedProcessCube',
                  {
                    defaultMessage: 'Terminated Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="loading"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate(
                  'xpack.securitySolution.resolver.graphControls.currentlyLoadingCube',
                  {
                    defaultMessage: 'Loading Process',
                  }
                )}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
            <StyledEuiDescriptionListTitle data-test-subj="resolver:graph-controls:node-legend:title">
              <CubeForProcess
                id={id}
                size="2.5em"
                data-test-subj="resolver:node-detail:title-icon"
                state="error"
              />
            </StyledEuiDescriptionListTitle>
            <StyledEuiDescriptionListDescription data-test-subj="resolver:graph-controls:node-legend:description">
              <GeneratedText>
                {i18n.translate('xpack.securitySolution.resolver.graphControls.errorCube', {
                  defaultMessage: 'Error Process',
                })}
              </GeneratedText>
            </StyledEuiDescriptionListDescription>
          </>
        </StyledDescriptionList>
      </div>
    </EuiPopover>
  );
};
