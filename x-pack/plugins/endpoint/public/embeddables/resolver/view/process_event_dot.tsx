/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiKeyboardAccessible } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, Matrix3, AdjacentProcessMap, ResolverProcessType } from '../types';
import { SymbolIds, NamedColors } from './defs';
import { ResolverEvent } from '../../../../common/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as eventModel from '../../../../common/models/event';
import * as processModel from '../models/process_event';
import * as selectors from '../store/selectors';

const nodeAssets = {
  runningProcessCube: {
    cubeSymbol: `#${SymbolIds.runningProcessCube}`,
    labelBackground: NamedColors.fullLabelBackground,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningProcess', {
      defaultMessage: 'Running Process',
    }),
  },
  runningTriggerCube: {
    cubeSymbol: `#${SymbolIds.runningTriggerCube}`,
    labelBackground: NamedColors.fullLabelBackground,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningTrigger', {
      defaultMessage: 'Running Trigger',
    }),
  },
  terminatedProcessCube: {
    cubeSymbol: `#${SymbolIds.terminatedProcessCube}`,
    labelBackground: NamedColors.fullLabelBackground,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.terminatedProcess', {
      defaultMessage: 'Terminated Process',
    }),
  },
  terminatedTriggerCube: {
    cubeSymbol: `#${SymbolIds.terminatedTriggerCube}`,
    labelBackground: NamedColors.fullLabelBackground,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.terminatedTrigger', {
      defaultMessage: 'Terminated Trigger',
    }),
  },
};

/**
 * A placeholder view for a process node.
 */
export const ProcessEventDot = styled(
  React.memo(
    ({
      className,
      position,
      event,
      projectionMatrix,
      adjacentNodeMap,
    }: {
      /**
       * A `className` string provided by `styled`
       */
      className?: string;
      /**
       * The positon of the process node, in 'world' coordinates.
       */
      position: Vector2;
      /**
       * An event which contains details about the process node.
       */
      event: ResolverEvent;
      /**
       * projectionMatrix which can be used to convert `position` to screen coordinates.
       */
      projectionMatrix: Matrix3;
      /**
       * map of what nodes are "adjacent" to this one in "up, down, previous, next" directions
       */
      adjacentNodeMap: AdjacentProcessMap;
    }) => {
      /**
       * Convert the position, which is in 'world' coordinates, to screen coordinates.
       */
      const [left, top] = applyMatrix3(position, projectionMatrix);

      /** The scale of the projection in the x-axis. Used to determine to overall scale of the process event node. */
      const [xScale] = projectionMatrix;

      /** The scale to render the process node at. */
      const scale = 4 * xScale;

      const selfId = adjacentNodeMap.self;

      const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
      const selectedDescendantId = useSelector(selectors.uiSelectedDescendantId);
      /** Dimensions of the SVG viewbox for the process event node. */
      const viewBoxWidth = 60;
      const viewBoxHeight = 15;
      const viewBoxMinX = -7.5;
      const viewBoxMinY = -7.5;
      const viewBox = `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;

      /** The width (and height) of the cube icon used to represent a process */
      const cubeIconSideLength = 15;

      /** The x position of the cube icon. TODO: Why is this value choosen? */
      const cubeIconX = -cubeIconSideLength / 2;
      /** TODO, why? */
      const cubeIconY = cubeIconX;

      /**
       * The cube icon shows a cube in an non-orthographic perspective. This is the ratio of the side length
       * to the length of the right side (as seen by the viewer)
       * TODO, consider rendering the cube in the same perspective (isometric) that is used to layout the nodes
       * on the graph.
       * TODO, this number is just a guess, calculate it using some tool
       */
      const rightSideOfIsometricCubeLengthRatio = 1 / 1.8847;

      /** The Y position of the background for the process name text element */
      const labelBackgroundY = cubeIconY + 0.25 * cubeIconSideLength;

      const labelYHeight = cubeIconSideLength * rightSideOfIsometricCubeLengthRatio;

      /** The height of the background of the process name text element */
      const labelBackgroundHeight = cubeIconSideLength * rightSideOfIsometricCubeLengthRatio;

      /** The width of the background of the process name text element.
       * Note: this is not dynamic based on the text.
       * TODO, this label needs ellipsis logic.
       */
      const labelBackgroundWidth = labelBackgroundHeight * 5;

      /** The font-size (unitless) of the description text */
      const descriptionTextFontSize = 2.67;

      /** The description (e.g. TERMINATED PROCESS) text x position */
      const descriptionTextX = cubeIconX + cubeIconSideLength;
      /**
       * The description (e.g. TERMINATED PROCESS) text y position
       * The bottom of the description text should be aligned roughly with the top of the label background.
       * The text is vertically centered on the y coordinate, so we subtract half its height from the
       * labelBackgroundY.
       **/
      const descriptionTextY = labelBackgroundY - descriptionTextFontSize / 2;

      /** TODO why? */
      const labelX = cubeIconX + 0.7 * cubeIconSideLength + 50 / 2;
      /** The y position for the process name text element */
      const labelY = labelBackgroundY + labelYHeight / 2;

      const nodeViewportStyle = useMemo(
        () => ({
          left: `${left}px`,
          top: `${top}px`,
          width: `${viewBoxWidth * scale}px`,
          height: `${viewBoxHeight * scale}px`,
          /** Adjust it up and to the left, so that the cube is centered */
          transform: `translateX(${cubeIconSideLength *
            scale *
            -0.5}px) translateY(${cubeIconSideLength * scale * -0.75}px)`,
        }),
        [left, scale, top]
      );

      /**
       * Type in non-SVG components scales as follows:
       *  (These values were adjusted to match the proportions in the comps provided by UX/Design)
       *  18.75 : The smallest readable font size at which labels/descriptions can be read. Font size will not scale below this.
       *  12.5 : A 'slope' at which the font size will scale w.r.t. to zoom level otherwise
       */
      const minimumFontSize = 18.75;
      const slopeOfFontScale = 12.5;
      const fontSizeAdjustmentForScale = left > 1 ? slopeOfFontScale * (left - 1) : 0;
      const scaledTypeSize = minimumFontSize + fontSizeAdjustmentForScale;

      const markerBaseSize = 15;
      const markerSize = markerBaseSize;
      const markerPositionOffset = -markerBaseSize / 2;

      /**
       * An element that should be animated when the node is clicked.
       */
      const animationTarget: {
        current:
          | (SVGAnimationElement & {
              /**
               * `beginElement` is by [w3](https://www.w3.org/TR/SVG11/animate.html#__smil__ElementTimeControl__beginElement)
               * but missing in [TSJS-lib-generator](https://github.com/microsoft/TSJS-lib-generator/blob/15a4678e0ef6de308e79451503e444e9949ee849/inputfiles/addedTypes.json#L1819)
               */
              beginElement: () => void;
            })
          | null;
      } = React.createRef();
      const { cubeSymbol, labelBackground, descriptionText } = nodeAssets[nodeType(event)];
      const resolverNodeIdGenerator = useMemo(() => htmlIdGenerator('resolverNode'), []);

      const nodeId = useMemo(() => resolverNodeIdGenerator(selfId), [
        resolverNodeIdGenerator,
        selfId,
      ]);
      const labelId = useMemo(() => resolverNodeIdGenerator(), [resolverNodeIdGenerator]);
      const descriptionId = useMemo(() => resolverNodeIdGenerator(), [resolverNodeIdGenerator]);

      const isActiveDescendant = nodeId === activeDescendantId;
      const isSelectedDescendant = nodeId === selectedDescendantId;

      const dispatch = useResolverDispatch();

      const handleFocus = useCallback(
        (focusEvent: React.FocusEvent<HTMLDivElement>) => {
          dispatch({
            type: 'userFocusedOnResolverNode',
            payload: {
              nodeId,
            },
          });
        },
        [dispatch, nodeId]
      );

      const handleClick = useCallback(
        (clickEvent: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          if (animationTarget.current !== null) {
            (animationTarget.current as any).beginElement();
          }
          dispatch({
            type: 'userSelectedResolverNode',
            payload: {
              nodeId,
            },
          });
        },
        [animationTarget, dispatch, nodeId]
      );
      /* eslint-disable jsx-a11y/click-events-have-key-events */
      /**
       * Key event handling (e.g. 'Enter'/'Space') is provisioned by the `EuiKeyboardAccessible` component
       */
      return (
        <EuiKeyboardAccessible>
          <div
            data-test-subj={'resolverNode'}
            className={className + ' kbn-resetFocusState'}
            role="treeitem"
            aria-level={adjacentNodeMap.level}
            aria-flowto={
              adjacentNodeMap.nextSibling === null ? undefined : adjacentNodeMap.nextSibling
            }
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            aria-haspopup={'true'}
            aria-current={isActiveDescendant ? 'true' : undefined}
            aria-selected={isSelectedDescendant ? 'true' : undefined}
            style={nodeViewportStyle}
            id={nodeId}
            onClick={handleClick}
            onFocus={handleFocus}
            tabIndex={-1}
          >
            <svg
              viewBox="-15 -15 90 30"
              preserveAspectRatio="xMidYMid meet"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: '0',
                left: '0',
              }}
            >
              <g>
                <use
                  xlinkHref={`#${SymbolIds.processCubeActiveBacking}`}
                  x={-11.35}
                  y={-11.35}
                  width={markerSize * 1.5}
                  height={markerSize * 1.5}
                  className="backing"
                />
                <use
                  role="presentation"
                  xlinkHref={cubeSymbol}
                  x={markerPositionOffset}
                  y={markerPositionOffset}
                  width={markerSize}
                  height={markerSize}
                  opacity="1"
                  className="cube"
                >
                  <animateTransform
                    attributeType="XML"
                    attributeName="transform"
                    type="scale"
                    values="1 1; 1 .83; 1 .8; 1 .83; 1 1"
                    dur="0.2s"
                    begin="click"
                    repeatCount="1"
                    className="squish"
                    ref={animationTarget}
                  />
                </use>
              </g>
            </svg>
            <div
              style={{
                left: '25%',
                top: '30%',
                position: 'absolute',
                width: '50%',
                color: 'white',
                fontSize: `${scaledTypeSize}px`,
                lineHeight: '140%',
              }}
            >
              <div
                id={descriptionId}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01px',
                  backgroundColor: NamedColors.resolverBackground,
                  lineHeight: '1.2',
                  fontWeight: 'bold',
                  fontSize: '.5em',
                  width: '100%',
                  margin: '0 0 .05em 0',
                  textAlign: 'left',
                  padding: '0',
                }}
              >
                {descriptionText}
              </div>
              <div
                data-test-subject="nodeLabel"
                id={labelId}
                style={{
                  backgroundColor: labelBackground,
                  padding: '.15em 0',
                  textAlign: 'center',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  contain: 'content',
                }}
              >
                {eventModel.eventName(event)}
              </div>
            </div>
          </div>
        </EuiKeyboardAccessible>
      );
      /* eslint-enable jsx-a11y/click-events-have-key-events */
    }
  )
)`
  position: absolute;
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  white-space: nowrap;
  will-change: left, top, width, height;
  contain: strict;

  //dasharray & dashoffset should be equal to "pull" the stroke back
  //when it is transitioned.
  //The value is tuned to look good when animated, but to preserve
  //the effect, it should always be _at least_ the length of the stroke
  & .backing {
    stroke-dasharray: 500;
    stroke-dashoffset: 500;
  }
  &[aria-current] .backing {
    transition-property: stroke-dashoffset;
    transition-duration: 1s;
    stroke-dashoffset: 0;
  }
`;

const processTypeToCube: Record<ResolverProcessType, keyof typeof nodeAssets> = {
  processCreated: 'terminatedProcessCube',
  processRan: 'runningProcessCube',
  processTerminated: 'terminatedProcessCube',
  unknownProcessEvent: 'runningProcessCube',
  processCausedAlert: 'runningTriggerCube',
  unknownEvent: 'runningProcessCube',
};

function nodeType(processEvent: ResolverEvent): keyof typeof nodeAssets {
  const processType = processModel.eventType(processEvent);

  if (processType in processTypeToCube) {
    return processTypeToCube[processType];
  }
  return 'runningProcessCube';
}
