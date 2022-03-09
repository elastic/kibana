/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useContext } from 'react';
import styled from 'styled-components';
import { htmlIdGenerator, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { NodeSubMenu } from './styles';
import { applyMatrix3 } from '../models/vector2';
import { Vector2, Matrix3, ResolverState } from '../types';
import { ResolverNode } from '../../../common/endpoint/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import { SideEffectContext } from './side_effect_context';
import * as nodeModel from '../../../common/endpoint/models/node';
import * as eventModel from '../../../common/endpoint/models/event';
import * as nodeDataModel from '../models/node_data';
import * as selectors from '../store/selectors';
import { fontSize } from './font_size';
import { useCubeAssets } from './use_cube_assets';
import { useSymbolIDs } from './use_symbol_ids';
import { useColors } from './use_colors';
import { useLinkProps } from './use_link_props';

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
  pointer-events: all;
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
  z-index: 45;
`;

interface StyledEuiButtonContent {
  readonly isShowingIcon: boolean;
}

const StyledEuiButtonContent = styled.span<StyledEuiButtonContent>`
  padding: ${(props) => (props.isShowingIcon ? '0px' : '0 12px')};
`;

const StyledOuterGroup = styled.g<{ isNodeLoading: boolean }>`
  fill: none;
  pointer-events: visiblePainted;
  // The below will apply the loading css to the <use> element that references the cube
  // when the nodeData is loading for the current node
  ${(props) =>
    props.isNodeLoading &&
    `
    & .cube {
    animation-name: pulse;
    /**
     * his is a multiple of .6 so it can match up with the EUI button's loading spinner
     * which is (0.6s). Using .6 here makes it a bit too fast.
     */
    animation-duration: 1.8s;
    animation-delay: 0;
    animation-direction: normal;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
  }

  /**
   * Animation loading state of the cube.
   */
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
    100% {
      opacity: 1;
    }
  }
  `}
`;

/**
 * An artifact that represents a process node and the things associated with it in the Resolver
 */
const UnstyledProcessEventDot = React.memo(
  ({
    className,
    position,
    node,
    nodeID,
    projectionMatrix,
    timeAtRender,
  }: {
    /**
     * A `className` string provided by `styled`
     */
    className?: string;
    /**
     * The positon of the graph node, in 'world' coordinates.
     */
    position: Vector2;
    /**
     * An event which contains details about the graph node.
     */
    node: ResolverNode;
    /**
     * The unique identifier for the node based on a datasource id
     */
    nodeID: string;
    /**
     * projectionMatrix which can be used to convert `position` to screen coordinates.
     */
    projectionMatrix: Matrix3;

    /**
     * The time (unix epoch) at render.
     */
    timeAtRender: number;
  }) => {
    const resolverComponentInstanceID = useSelector(selectors.resolverComponentInstanceID);
    // This should be unique to each instance of Resolver
    const htmlIDPrefix = `resolver:${resolverComponentInstanceID}`;

    const symbolIDs = useSymbolIDs();
    const { timestamp } = useContext(SideEffectContext);

    /**
     * Convert the position, which is in 'world' coordinates, to screen coordinates.
     */
    const [left, top] = applyMatrix3(position, projectionMatrix);

    const [xScale] = projectionMatrix;

    // Node (html id=) IDs
    const ariaActiveDescendant = useSelector(selectors.ariaActiveDescendant);
    const selectedNode = useSelector(selectors.selectedNode);
    const originID = useSelector(selectors.originID);
    const nodeStats = useSelector((state: ResolverState) => selectors.nodeStats(state)(nodeID));

    // define a standard way of giving HTML IDs to nodes based on their entity_id/nodeID.
    // this is used to link nodes via aria attributes
    const nodeHTMLID = useCallback(
      (id: string) => htmlIdGenerator(htmlIDPrefix)(`${id}:node`),
      [htmlIDPrefix]
    );

    const ariaLevel: number | null = useSelector((state: ResolverState) =>
      selectors.ariaLevel(state)(nodeID)
    );

    // the node ID to 'flowto'
    const ariaFlowtoNodeID: string | null = useSelector((state: ResolverState) =>
      selectors.ariaFlowtoNodeID(state)(timeAtRender)(nodeID)
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
     *  18.75 : The smallest readable font size at which labels/descriptions can be read. Font size will not scale below this.
     *  12.5 : A 'slope' at which the font size will scale w.r.t. to zoom level otherwise
     */
    const scaledTypeSize = fontSize(xScale, 18.75, 12.5);

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
            beginElement?: () => void;
          })
        | null;
    } = React.createRef();
    const colorMap = useColors();

    const nodeState = useSelector((state: ResolverState) =>
      selectors.nodeDataStatus(state)(nodeID)
    );
    const isNodeLoading = nodeState === 'loading';
    const {
      backingFill,
      cubeSymbol,
      descriptionText,
      isLabelFilled,
      labelButtonFill,
      strokeColor,
    } = useCubeAssets(
      nodeState,
      /**
       * There is no definition for 'trigger process' yet. return false.
       */ false
    );

    const labelHTMLID = htmlIdGenerator('resolver')(`${nodeID}:label`);

    const isAriaCurrent = nodeID === ariaActiveDescendant;
    const isAriaSelected = nodeID === selectedNode;
    const isOrigin = nodeID === originID;

    const dispatch = useResolverDispatch();

    const processDetailNavProps = useLinkProps({
      panelView: 'nodeDetail',
      panelParameters: { nodeID },
    });

    const handleFocus = useCallback(() => {
      dispatch({
        type: 'userFocusedOnResolverNode',
        payload: {
          nodeID,
          time: timestamp(),
        },
      });
    }, [dispatch, nodeID, timestamp]);

    const handleClick = useCallback(
      (clickEvent) => {
        if (animationTarget.current?.beginElement) {
          animationTarget.current.beginElement();
        }

        if (nodeState === 'error') {
          dispatch({
            type: 'userReloadedResolverNode',
            payload: nodeID,
          });
        } else {
          dispatch({
            type: 'userSelectedResolverNode',
            payload: {
              nodeID,
              time: timestamp(),
            },
          });
          processDetailNavProps.onClick(clickEvent);
        }
      },
      [animationTarget, dispatch, nodeID, processDetailNavProps, nodeState, timestamp]
    );

    const grandTotal: number | null = useSelector((state: ResolverState) =>
      selectors.statsTotalForNode(state)(node)
    );
    const nodeName = nodeModel.nodeName(node);
    const processEvent = useSelector((state: ResolverState) =>
      nodeDataModel.firstEvent(selectors.nodeDataForID(state)(String(node.id)))
    );
    const processName = useMemo(() => {
      if (processEvent !== undefined) {
        return eventModel.processNameSafeVersion(processEvent);
      } else {
        return nodeName;
      }
    }, [processEvent, nodeName]);

    /* eslint-disable jsx-a11y/click-events-have-key-events */
    return (
      <div
        data-test-subj="resolver:node"
        data-test-resolver-node-id={nodeID}
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
          onClick={
            (clickEvent) => {
              handleFocus();
              handleClick(clickEvent);
            } /* a11y note: this is strictly an alternate to the button, so no tabindex is necessary*/
          }
          role="img"
          aria-labelledby={labelHTMLID}
          fill="none"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: '0',
            left: '0',
            outline: 'transparent',
            border: 'none',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          <StyledOuterGroup isNodeLoading={isNodeLoading}>
            <use
              xlinkHref={`#${symbolIDs.processCubeActiveBacking}`}
              fill={backingFill} // Only visible on hover
              x={-15.35}
              y={-15.35}
              stroke={strokeColor}
              width={markerSize * 1.5}
              height={markerSize * 1.5}
              className="backing"
            />
            {isOrigin && (
              <use
                xlinkHref={`#${symbolIDs.processCubeActiveBacking}`}
                fill="transparent" // Transparent so we don't double up on the default hover
                x={-15.35}
                y={-15.35}
                stroke={strokeColor}
                strokeOpacity={0.35}
                strokeDashoffset={0}
                width={markerSize * 1.5}
                height={markerSize * 1.5}
                className="origin"
              />
            )}
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
          </StyledOuterGroup>
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
            data-test-subj="resolver:node:description"
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.processDescription"
              defaultMessage="{isEventBeingAnalyzed, select, true {Analyzed Event · {descriptionText}} false {{descriptionText}}}"
              values={{
                isEventBeingAnalyzed: isOrigin,
                descriptionText,
              }}
            />
          </StyledDescriptionText>
          <div
            className={'euiButton euiButton--small'}
            id={labelHTMLID}
            onClick={handleClick}
            onFocus={handleFocus}
            tabIndex={-1}
            style={{
              backgroundColor: colorMap.resolverBackground,
              alignSelf: 'flex-start',
              padding: 0,
              zIndex: 45,
            }}
          >
            <EuiButton
              iconSide={isNodeLoading ? 'right' : 'left'}
              isLoading={isNodeLoading}
              color={labelButtonFill}
              fill={isLabelFilled}
              iconType={nodeState === 'error' ? 'refresh' : ''}
              size="s"
              style={{
                maxHeight: `${Math.min(26 + xScale * 3, 32)}px`,
                maxWidth: `${isShowingEventActions ? 400 : 210 * xScale}px`,
              }}
              tabIndex={-1}
              title={processName}
              data-test-subj="resolver:node:primary-button"
              data-test-resolver-node-id={nodeID}
            >
              <StyledEuiButtonContent
                isShowingIcon={nodeState === 'loading' || nodeState === 'error'}
              >
                <span className="euiButton__text" data-test-subj={'euiButton__text'}>
                  {i18n.translate('xpack.securitySolution.resolver.node_button_name', {
                    defaultMessage: `{nodeState, select, error {Reload {nodeName}} other {{nodeName}}}`,
                    values: {
                      nodeState,
                      nodeName: processName,
                    },
                  })}
                </span>
              </StyledEuiButtonContent>
            </EuiButton>
          </div>
          <EuiFlexGroup
            justifyContent="flexStart"
            gutterSize="xs"
            style={{
              alignSelf: 'flex-start',
              background: colorMap.resolverBackground,
              display: `${isShowingEventActions ? 'flex' : 'none'}`,
              margin: '2px 0 0 0',
              padding: 0,
            }}
          >
            <EuiFlexItem grow={false} className="related-dropdown">
              {grandTotal !== null && grandTotal > 0 && (
                <NodeSubMenu
                  buttonFill={colorMap.resolverBackground}
                  nodeStats={nodeStats}
                  nodeID={nodeID}
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
  min-width: 280px;
  min-height: 90px;
  overflow-y: visible;
  pointer-events: none;
  z-index: auto;

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
