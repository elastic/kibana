/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  htmlIdGenerator,
  EuiKeyboardAccessible,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
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
    labelBackground: NamedColors.labelBackgroundRunningProcess,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningProcess', {
      defaultMessage: 'Running Process',
    }),
  },
  runningTriggerCube: {
    cubeSymbol: `#${SymbolIds.runningTriggerCube}`,
    labelBackground: NamedColors.labelBackgroundRunningTrigger,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.runningTrigger', {
      defaultMessage: 'Running Trigger',
    }),
  },
  terminatedProcessCube: {
    cubeSymbol: `#${SymbolIds.terminatedProcessCube}`,
    labelBackground: NamedColors.labelBackgroundTerminatedProcess,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.terminatedProcess', {
      defaultMessage: 'Terminated Process',
    }),
  },
  terminatedTriggerCube: {
    cubeSymbol: `#${SymbolIds.terminatedTriggerCube}`,
    labelBackground: NamedColors.labelBackgroundTerminatedTrigger,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.endpoint.resolver.terminatedTrigger', {
      defaultMessage: 'Terminated Trigger',
    }),
  },
};

const ChildEventsButton = React.memo(() => {
  return (
    <EuiButton
      onClick={useCallback((clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      }, [])}
      color="ghost"
      size="s"
      iconType="arrowDown"
      iconSide="right"
      tabIndex={-1}
    >
      {i18n.translate('xpack.endpoint.resolver.relatedEvents', {
        defaultMessage: 'Events',
      })}
    </EuiButton>
  );
});

const RelatedAlertsButton = React.memo(() => {
  return (
    <EuiButton
      onClick={useCallback((clickEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      }, [])}
      color="ghost"
      size="s"
      tabIndex={-1}
    >
      {i18n.translate('xpack.endpoint.resolver.relatedAlerts', {
        defaultMessage: 'Related Alerts',
      })}
    </EuiButton>
  );
});

/**
 * An artefact that represents a process node.
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

      const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
      const selectedDescendantId = useSelector(selectors.uiSelectedDescendantId);

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

      /**
       * Type in non-SVG components scales as follows:
       *  (These values were adjusted to match the proportions in the comps provided by UX/Design)
       *  18.75 : The smallest readable font size at which labels/descriptions can be read. Font size will not scale below this.
       *  12.5 : A 'slope' at which the font size will scale w.r.t. to zoom level otherwise
       */
      const minimumFontSize = 18.75;
      const slopeOfFontScale = 12.5;
      const fontSizeAdjustmentForScale = magFactorX > 1 ? slopeOfFontScale * (magFactorX - 1) : 0;
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
                display: 'flex',
                flexFlow: 'column',
                left: '25%',
                top: '30%',
                position: 'absolute',
                width: '50%',
                color: NamedColors.full,
                fontSize: `${scaledTypeSize}px`,
                lineHeight: '140%',
                backgroundColor: NamedColors.resolverBackground,
                padding: '.25rem',
              }}
            >
              <div
                id={descriptionId}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01px',
                  backgroundColor: NamedColors.resolverBackground,
                  lineHeight: '1',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  width: '100%',
                  margin: '0',
                  textAlign: 'left',
                  padding: '0',
                  color: NamedColors.empty,
                }}
              >
                {descriptionText}
              </div>
              <div
                className={magFactorX >= 2 ? 'euiButton' : 'euiButton euiButton--small'}
                data-test-subject="nodeLabel"
                id={labelId}
                style={{
                  backgroundColor: labelBackground,
                  padding: '.15rem 0',
                  textAlign: 'center',
                  maxWidth: '20rem',
                  minWidth: '12rem',
                  width: '60%',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  contain: 'content',
                  margin: '.25rem 0 .35rem 0',
                }}
              >
                <span className="euiButton__content">
                  <span className="euiButton__text" data-test-subj={'euiButton__text'}>
                    {eventModel.eventName(event)}
                  </span>
                </span>
              </div>
              {magFactorX >= 2 && (
                <EuiFlexGroup justifyContent="flexStart" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <RelatedAlertsButton />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <ChildEventsButton />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </div>
          </div>
        </EuiKeyboardAccessible>
      );
      /* eslint-enable jsx-a11y/click-events-have-key-events */
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
  min-width: 280px;
  min-height: 90px;

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
