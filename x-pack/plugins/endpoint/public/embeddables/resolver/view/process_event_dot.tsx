/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { htmlIdGenerator, EuiKeyboardAccessible } from '@elastic/eui';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, Matrix3, AdjacentProcessMap, ResolverProcessType } from '../types';
import { SymbolIds, NamedColors, PaintServerIds } from './defs';
import { ResolverEvent } from '../../../../common/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as eventModel from '../../../../common/models/event';
import * as processModel from '../models/process_event';

const nodeAssets = {
  runningProcessCube: {
    cubeSymbol: `#${SymbolIds.runningProcessCube}`,
    labelFill: `url(#${PaintServerIds.runningProcess})`,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningProcess', {
      defaultMessage: 'Running Process',
    }),
  },
  runningTriggerCube: {
    cubeSymbol: `#${SymbolIds.runningTriggerCube}`,
    labelFill: `url(#${PaintServerIds.runningTrigger})`,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningTrigger', {
      defaultMessage: 'Running Trigger',
    }),
  },
  terminatedProcessCube: {
    cubeSymbol: `#${SymbolIds.terminatedProcessCube}`,
    labelFill: NamedColors.fullLabelBackground,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.terminatedProcess', {
      defaultMessage: 'Terminated Process',
    }),
  },
  terminatedTriggerCube: {
    cubeSymbol: `#${SymbolIds.terminatedTriggerCube}`,
    labelFill: NamedColors.fullLabelBackground,
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

      const [magFactorX] = projectionMatrix;

      const selfId = adjacentNodeMap.self;

      const nodeViewportStyle = useMemo(
        () => ({
          left: `${left}px`,
          top: `${top}px`,
          // Width of symbol viewport scaled to fit
          width: `${360 * magFactorX}px`,
          // Height according to symbol viewbox AR
          height: `${120 * magFactorX}px`,
          // Adjusted to position/scale with camera
          transform: `translateX(-${0.172413 * 360 * magFactorX + 10}px) translateY(-${0.73684 *
            120 *
            magFactorX}px)`,
        }),
        [left, magFactorX, top]
      );

      const markerBaseSize = 15;
      const markerSize = markerBaseSize;
      const markerPositionOffset = -markerBaseSize / 2;

      const labelYOffset = markerPositionOffset + 0.25 * markerSize - 0.5;

      const labelYHeight = markerSize / 1.7647;

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
      const { cubeSymbol, labelFill, descriptionFill, descriptionText } = nodeAssets[
        nodeType(event)
      ];
      const resolverNodeIdGenerator = useMemo(() => htmlIdGenerator('resolverNode'), []);

      const nodeId = useMemo(() => resolverNodeIdGenerator(selfId), [
        resolverNodeIdGenerator,
        selfId,
      ]);
      const labelId = useMemo(() => resolverNodeIdGenerator(), [resolverNodeIdGenerator]);
      const descriptionId = useMemo(() => resolverNodeIdGenerator(), [resolverNodeIdGenerator]);

      const dispatch = useResolverDispatch();

      const handleFocus = useCallback(
        (focusEvent: React.FocusEvent<SVGSVGElement>) => {
          dispatch({
            type: 'userFocusedOnResolverNode',
            payload: {
              nodeId,
            },
          });
          focusEvent.currentTarget.setAttribute('aria-current', 'true');
        },
        [dispatch, nodeId]
      );

      const handleClick = useCallback(() => {
        if (animationTarget.current !== null) {
          animationTarget.current.beginElement();
        }
      }, [animationTarget]);

      return (
        <EuiKeyboardAccessible>
          <svg
            data-test-subj={'resolverNode'}
            className={className + ' kbn-resetFocusState'}
            viewBox="-15 -15 90 30"
            preserveAspectRatio="xMidYMid meet"
            role="treeitem"
            aria-level={adjacentNodeMap.level}
            aria-flowto={
              adjacentNodeMap.nextSibling === null ? undefined : adjacentNodeMap.nextSibling
            }
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            aria-haspopup={'true'}
            style={nodeViewportStyle}
            id={nodeId}
            onClick={handleClick}
            onFocus={handleFocus}
            tabIndex={-1}
          >
            <g>
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
              <use
                role="presentation"
                xlinkHref={`#${SymbolIds.processNodeLabel}`}
                x={markerPositionOffset + markerSize - 0.5}
                y={labelYOffset}
                width={(markerSize / 1.7647) * 5}
                height={markerSize / 1.7647}
                opacity="1"
                fill={labelFill}
              />
              <text
                x={markerPositionOffset + 0.7 * markerSize + 50 / 2}
                y={labelYOffset + labelYHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.75"
                fontWeight="bold"
                fill={NamedColors.empty}
                paintOrder="stroke"
                tabIndex={-1}
                style={{ letterSpacing: '-0.02px' }}
                id={labelId}
              >
                {eventModel.eventName(event)}
              </text>
              <text
                x={markerPositionOffset + markerSize}
                y={labelYOffset - 1}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize="2.67"
                fill={descriptionFill}
                id={descriptionId}
                paintOrder="stroke"
                fontWeight="bold"
                style={{ textTransform: 'uppercase', letterSpacing: '-0.01px' }}
              >
                {descriptionText}
              </text>
            </g>
          </svg>
        </EuiKeyboardAccessible>
      );
    }
  )
)`
  position: absolute;
  display: block;
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
  will-change: left, top, width, height;
  contain: strict;
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
