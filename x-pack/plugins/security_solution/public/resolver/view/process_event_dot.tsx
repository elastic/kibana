/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { htmlIdGenerator, EuiButton, EuiI18nNumber, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { NodeSubMenu, subMenuAssets } from './submenu';
import { applyMatrix3 } from '../models/vector2';
import { Vector2, Matrix3 } from '../types';
import { SymbolIds, useResolverTheme, calculateResolverFontSize } from './assets';
import { ResolverEvent, ResolverNodeStats } from '../../../common/endpoint/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as eventModel from '../../../common/endpoint/models/event';
import * as processEventModel from '../models/process_event';
import * as selectors from '../store/selectors';
import { useResolverQueryParams } from './use_resolver_query_params';

interface StyledActionsContainer {
  readonly color: string;
  readonly fontSize: number;
  readonly topPct: number;
}

const StyledActionsContainer = styled.div<StyledActionsContainer>`
  background-color: transparent;
  color: ${(props) => props.color};
  display: flex;
  flex-flow: column;
  font-size: ${(props) => `${props.fontSize}px`};
  left: 20.9%;
  line-height: 140%;
  padding: 0.25rem 0 0 0.1rem;
  position: absolute;
  top: ${(props) => `${props.topPct}%`};
  width: auto;
`;

interface StyledDescriptionText {
  readonly backgroundColor: string;
  readonly color: string;
  readonly isDisplaying: boolean;
}

const StyledDescriptionText = styled.div<StyledDescriptionText>`
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.color};
  display: ${(props) => (props.isDisplaying ? 'block' : 'none')};
  font-size: 0.8rem;
  font-weight: bold;
  letter-spacing: -0.01px;
  line-height: 1;
  margin: 0;
  padding: 4px 0 0 2px;
  text-align: left;
  text-transform: uppercase;
  width: fit-content;
`;

/**
 * An artifact that represents a process node and the things associated with it in the Resolver
 */
const UnstyledProcessEventDot = React.memo(
  ({
    className,
    position,
    event,
    projectionMatrix,
    isProcessTerminated,
    isProcessOrigin,
    relatedEventsStatsForProcess,
    timeAtRender,
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
     * Whether or not to show the process as terminated.
     */
    isProcessTerminated: boolean;
    /**
     * Whether or not to show the process as the originating event.
     */
    isProcessOrigin: boolean;
    /**
     * A collection of events related to the current node and statistics (e.g. counts indexed by event type)
     * to provide the user some visibility regarding the contents thereof.
     * Statistics for the number of related events and alerts for this process node
     */
    relatedEventsStatsForProcess?: ResolverNodeStats;

    /**
     * The time (unix epoch) at render.
     */
    timeAtRender: number;
  }) => {
    const resolverComponentInstanceID = useSelector(selectors.resolverComponentInstanceID);
    // This should be unique to each instance of Resolver
    const htmlIDPrefix = `resolver:${resolverComponentInstanceID}`;

    /**
     * Convert the position, which is in 'world' coordinates, to screen coordinates.
     */
    const [left, top] = applyMatrix3(position, projectionMatrix);

    const [xScale] = projectionMatrix;

    // Node (html id=) IDs
    const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
    const selectedDescendantId = useSelector(selectors.uiSelectedDescendantId);
    const nodeID = processEventModel.uniquePidForProcess(event);

    // define a standard way of giving HTML IDs to nodes based on their entity_id/nodeID.
    // this is used to link nodes via aria attributes
    const nodeHTMLID = useCallback((id: string) => htmlIdGenerator(htmlIDPrefix)(`${id}:node`), [
      htmlIDPrefix,
    ]);

    const ariaLevel: number | null = useSelector(selectors.ariaLevel)(nodeID);

    // the node ID to 'flowto'
    const ariaFlowtoNodeID: string | null = useSelector(selectors.ariaFlowtoNodeID)(timeAtRender)(
      nodeID
    );

    const isShowingEventActions = xScale > 0.8;
    const isShowingDescriptionText = xScale >= 0.55;

    /**
     * As the resolver zooms and buttons and text change visibility, we look to keep the overall container properly vertically aligned
     */
    const actionableButtonsTopOffset =
      (isShowingEventActions ? 3.5 : isShowingDescriptionText ? 1 : 21) * xScale + 5;

    /**
     * The `left` and `top` values represent the 'center' point of the process node.
     * Since the view has content to the left and above the 'center' point, offset the
     * position to accomodate for that. This aligns the logical center of the process node
     * with the correct position on the map.
     */

    const logicalProcessNodeViewWidth = 360;
    const logicalProcessNodeViewHeight = 120;

    /**
     * As the scale changes and button visibility toggles on the graph, these offsets help scale to keep the nodes centered on the edge
     */
    const nodeXOffsetValue = isShowingEventActions ? -0.147413 : -0.147413 - (xScale - 0.5) * 0.08;
    const nodeYOffsetValue = isShowingEventActions
      ? -0.53684
      : -0.53684 + (-xScale * 0.2 * (1 - xScale)) / xScale;

    const processNodeViewXOffset = nodeXOffsetValue * logicalProcessNodeViewWidth * xScale;
    const processNodeViewYOffset = nodeYOffsetValue * logicalProcessNodeViewHeight * xScale;

    const nodeViewportStyle = useMemo(
      () => ({
        left: `${left + processNodeViewXOffset}px`,
        top: `${top + processNodeViewYOffset}px`,
        // Width of symbol viewport scaled to fit
        width: `${logicalProcessNodeViewWidth * xScale}px`,
        // Height according to symbol viewbox AR
        height: `${logicalProcessNodeViewHeight * xScale}px`,
      }),
      [left, xScale, processNodeViewXOffset, processNodeViewYOffset, top]
    );

    /**
     * Type in non-SVG components scales as follows:
     *  (These values were adjusted to match the proportions in the comps provided by UX/Design)
     *  18.75 : The smallest readable font size at which labels/descriptions can be read. Font size will not scale below this.
     *  12.5 : A 'slope' at which the font size will scale w.r.t. to zoom level otherwise
     */
    const scaledTypeSize = calculateResolverFontSize(xScale, 18.75, 12.5);

    const markerBaseSize = 15;
    const markerSize = markerBaseSize;
    const markerPositionYOffset = -markerBaseSize / 2 - 4;
    const markerPositionXOffset = -markerBaseSize / 2 - 4;

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
    const { colorMap, cubeAssetsForNode } = useResolverTheme();
    const {
      backingFill,
      cubeSymbol,
      descriptionText,
      isLabelFilled,
      labelButtonFill,
      strokeColor,
    } = cubeAssetsForNode(isProcessTerminated, isProcessOrigin);

    const labelHTMLID = htmlIdGenerator('resolver')(`${nodeID}:label`);

    const isAriaCurrent = nodeID === activeDescendantId;
    const isAriaSelected = nodeID === selectedDescendantId;

    const dispatch = useResolverDispatch();

    const handleFocus = useCallback(() => {
      dispatch({
        type: 'userFocusedOnResolverNode',
        payload: {
          nodeId: nodeHTMLID(nodeID),
        },
      });
    }, [dispatch, nodeHTMLID, nodeID]);

    const handleRelatedEventRequest = useCallback(() => {
      dispatch({
        type: 'userRequestedRelatedEventData',
        payload: nodeID,
      });
    }, [dispatch, nodeID]);

    const { pushToQueryParams } = useResolverQueryParams();

    const handleClick = useCallback(() => {
      if (animationTarget.current !== null) {
        // This works but the types are missing in the typescript DOM lib
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (animationTarget.current as any).beginElement();
      }
      dispatch({
        type: 'userSelectedResolverNode',
        payload: {
          nodeId: nodeHTMLID(nodeID),
          selectedProcessId: nodeID,
        },
      });
      pushToQueryParams({ crumbId: nodeID, crumbEvent: 'all' });
    }, [animationTarget, dispatch, pushToQueryParams, nodeID, nodeHTMLID]);

    /**
     * Enumerates the stats for related events to display with the node as options,
     * generally in the form `number of related events in category` `category title`
     * e.g. "10 DNS", "230 File"
     */

    const relatedEventOptions = useMemo(() => {
      const relatedStatsList = [];

      if (!relatedEventsStatsForProcess) {
        // Return an empty set of options if there are no stats to report
        return [];
      }
      // If we have entries to show, map them into options to display in the selectable list

      for (const [category, total] of Object.entries(
        relatedEventsStatsForProcess.events.byCategory
      )) {
        relatedStatsList.push({
          prefix: <EuiI18nNumber value={total || 0} />,
          optionTitle: category,
          action: () => {
            dispatch({
              type: 'userSelectedRelatedEventCategory',
              payload: {
                subject: event,
                category,
              },
            });

            pushToQueryParams({ crumbId: nodeID, crumbEvent: category });
          },
        });
      }
      return relatedStatsList;
    }, [relatedEventsStatsForProcess, dispatch, event, pushToQueryParams, nodeID]);

    const relatedEventStatusOrOptions = !relatedEventsStatsForProcess
      ? subMenuAssets.initialMenuStatus
      : relatedEventOptions;

    const grandTotal: number | null = useSelector(selectors.relatedEventTotalForProcess)(event);

    /* eslint-disable jsx-a11y/click-events-have-key-events */
    /**
     * Key event handling (e.g. 'Enter'/'Space') is provisioned by the `EuiKeyboardAccessible` component
     */
    return (
      <div
        data-test-subj={'resolverNode'}
        className={`${className} kbn-resetFocusState`}
        role="treeitem"
        aria-level={ariaLevel === null ? undefined : ariaLevel}
        aria-flowto={ariaFlowtoNodeID === null ? undefined : nodeHTMLID(ariaFlowtoNodeID)}
        aria-labelledby={labelHTMLID}
        aria-haspopup="true"
        aria-current={isAriaCurrent ? 'true' : undefined}
        aria-selected={isAriaSelected ? 'true' : undefined}
        style={nodeViewportStyle}
        id={nodeHTMLID(nodeID)}
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
              fill={backingFill} // Only visible on hover
              x={-15.35}
              y={-15.35}
              stroke={strokeColor}
              width={markerSize * 1.5}
              height={markerSize * 1.5}
              className="backing"
            />
            <use
              role="presentation"
              xlinkHref={cubeSymbol}
              x={markerPositionXOffset}
              y={markerPositionYOffset}
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
                repeatCount="1"
                className="squish"
                ref={animationTarget}
              />
            </use>
          </g>
        </svg>
        <StyledActionsContainer
          color={colorMap.full}
          fontSize={scaledTypeSize}
          topPct={actionableButtonsTopOffset}
        >
          <StyledDescriptionText
            backgroundColor={colorMap.resolverBackground}
            color={colorMap.descriptionText}
            isDisplaying={isShowingDescriptionText}
          >
            {descriptionText}
          </StyledDescriptionText>
          <div
            className={xScale >= 2 ? 'euiButton' : 'euiButton euiButton--small'}
            id={labelHTMLID}
            onClick={handleClick}
            onFocus={handleFocus}
            tabIndex={-1}
            style={{
              backgroundColor: colorMap.resolverBackground,
              alignSelf: 'flex-start',
              padding: 0,
            }}
          >
            <EuiButton
              color={labelButtonFill}
              fill={isLabelFilled}
              size="s"
              style={{
                maxHeight: `${Math.min(26 + xScale * 3, 32)}px`,
                maxWidth: `${isShowingEventActions ? 400 : 210 * xScale}px`,
              }}
              tabIndex={-1}
              title={eventModel.eventName(event)}
            >
              <span className="euiButton__content">
                <span className="euiButton__text" data-test-subj={'euiButton__text'}>
                  {eventModel.eventName(event)}
                </span>
              </span>
            </EuiButton>
          </div>
          <EuiFlexGroup
            justifyContent="flexStart"
            gutterSize="xs"
            style={{
              alignSelf: 'flex-start',
              background: colorMap.resolverBackground,
              display: `${isShowingEventActions ? 'flex' : 'none'}`,
              margin: 0,
              padding: 0,
            }}
          >
            <EuiFlexItem grow={false} className="related-dropdown">
              {grandTotal !== null && grandTotal > 0 && (
                <NodeSubMenu
                  count={grandTotal}
                  buttonBorderColor={labelButtonFill}
                  buttonFill={colorMap.resolverBackground}
                  menuAction={handleRelatedEventRequest}
                  menuTitle={subMenuAssets.relatedEvents.title}
                  optionsWithActions={relatedEventStatusOrOptions}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </StyledActionsContainer>
      </div>
    );
    /* eslint-enable jsx-a11y/click-events-have-key-events */
  }
);

export const ProcessEventDot = styled(UnstyledProcessEventDot)`
  position: absolute;
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  white-space: nowrap;
  will-change: left, top, width, height;
  contain: layout;
  min-width: 280px;
  min-height: 90px;
  overflow-y: visible;

  //dasharray & dashoffset should be equal to "pull" the stroke back
  //when it is transitioned.
  //The value is tuned to look good when animated, but to preserve
  //the effect, it should always be _at least_ the length of the stroke
  & .backing {
    stroke-dasharray: 500;
    stroke-dashoffset: 500;
    fill-opacity: 0;
  }
  &:hover:not([aria-current]) .backing {
    transition-property: fill-opacity;
    transition-duration: 0.25s;
    fill-opacity: 1; // actual color opacity handled in the fill hex
  }

  &[aria-current] .backing {
    transition-property: stroke-dashoffset;
    transition-duration: 1s;
    stroke-dashoffset: 0;
  }

  & .euiButton {
    width: fit-content;
  }

  & .euiSelectableList-bordered {
    border-top-right-radius: 0px;
    border-top-left-radius: 0px;
  }
  & .euiSelectableListItem {
    background-color: black;
  }
  & .euiSelectableListItem path {
    fill: white;
  }
  & .euiSelectableListItem__text {
    color: white;
  }
`;
