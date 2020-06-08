/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import {
  htmlIdGenerator,
  EuiButton,
  EuiI18nNumber,
  EuiKeyboardAccessible,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { NodeSubMenu, subMenuAssets } from './submenu';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, Matrix3, AdjacentProcessMap } from '../types';
import { SymbolIds, useResolverTheme, NodeStyleMap, calculateResolverFontSize } from './assets';
import { ResolverEvent, ResolverNodeStats } from '../../../common/endpoint/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as eventModel from '../../../common/endpoint/models/event';
import * as processModel from '../models/process_event';
import * as selectors from '../store/selectors';

/**
 * Take a gross `schemaName` and return a beautiful translated one.
 */
const getDisplayName: (schemaName: string) => string = function nameInSchemaToDisplayName(
  schemaName: string
) {
  const displayNameRecord: Record<string, string> = {
    application: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.applicationEventTypeDisplayName',
      {
        defaultMessage: 'Application',
      }
    ),
    apm: i18n.translate('xpack.securitySolution.endpoint.resolver.apmEventTypeDisplayName', {
      defaultMessage: 'APM',
    }),
    audit: i18n.translate('xpack.securitySolution.endpoint.resolver.auditEventTypeDisplayName', {
      defaultMessage: 'Audit',
    }),
    authentication: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.authenticationEventTypeDisplayName',
      {
        defaultMessage: 'Authentication',
      }
    ),
    certificate: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.certificateEventTypeDisplayName',
      {
        defaultMessage: 'Certificate',
      }
    ),
    cloud: i18n.translate('xpack.securitySolution.endpoint.resolver.cloudEventTypeDisplayName', {
      defaultMessage: 'Cloud',
    }),
    database: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.databaseEventTypeDisplayName',
      {
        defaultMessage: 'Database',
      }
    ),
    driver: i18n.translate('xpack.securitySolution.endpoint.resolver.driverEventTypeDisplayName', {
      defaultMessage: 'Driver',
    }),
    email: i18n.translate('xpack.securitySolution.endpoint.resolver.emailEventTypeDisplayName', {
      defaultMessage: 'Email',
    }),
    file: i18n.translate('xpack.securitySolution.endpoint.resolver.fileEventTypeDisplayName', {
      defaultMessage: 'File',
    }),
    host: i18n.translate('xpack.securitySolution.endpoint.resolver.hostEventTypeDisplayName', {
      defaultMessage: 'Host',
    }),
    iam: i18n.translate('xpack.securitySolution.endpoint.resolver.iamEventTypeDisplayName', {
      defaultMessage: 'IAM',
    }),
    iam_group: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.iam_groupEventTypeDisplayName',
      {
        defaultMessage: 'IAM Group',
      }
    ),
    intrusion_detection: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.intrusion_detectionEventTypeDisplayName',
      {
        defaultMessage: 'Intrusion Detection',
      }
    ),
    malware: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.malwareEventTypeDisplayName',
      {
        defaultMessage: 'Malware',
      }
    ),
    network_flow: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.network_flowEventTypeDisplayName',
      {
        defaultMessage: 'Network Flow',
      }
    ),
    network: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.networkEventTypeDisplayName',
      {
        defaultMessage: 'Network',
      }
    ),
    package: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.packageEventTypeDisplayName',
      {
        defaultMessage: 'Package',
      }
    ),
    process: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.processEventTypeDisplayName',
      {
        defaultMessage: 'Process',
      }
    ),
    registry: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.registryEventTypeDisplayName',
      {
        defaultMessage: 'Registry',
      }
    ),
    session: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.sessionEventTypeDisplayName',
      {
        defaultMessage: 'Session',
      }
    ),
    service: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.serviceEventTypeDisplayName',
      {
        defaultMessage: 'Service',
      }
    ),
    socket: i18n.translate('xpack.securitySolution.endpoint.resolver.socketEventTypeDisplayName', {
      defaultMessage: 'Socket',
    }),
    vulnerability: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.vulnerabilityEventTypeDisplayName',
      {
        defaultMessage: 'Vulnerability',
      }
    ),
    web: i18n.translate('xpack.securitySolution.endpoint.resolver.webEventTypeDisplayName', {
      defaultMessage: 'Web',
    }),
    alert: i18n.translate('xpack.securitySolution.endpoint.resolver.alertEventTypeDisplayName', {
      defaultMessage: 'Alert',
    }),
    security: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.securityEventTypeDisplayName',
      {
        defaultMessage: 'Security',
      }
    ),
    dns: i18n.translate('xpack.securitySolution.endpoint.resolver.dnsEventTypeDisplayName', {
      defaultMessage: 'DNS',
    }),
    clr: i18n.translate('xpack.securitySolution.endpoint.resolver.clrEventTypeDisplayName', {
      defaultMessage: 'CLR',
    }),
    image_load: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.image_loadEventTypeDisplayName',
      {
        defaultMessage: 'Image Load',
      }
    ),
    powershell: i18n.translate(
      'xpack.securitySolution.endpoint.resolver.powershellEventTypeDisplayName',
      {
        defaultMessage: 'Powershell',
      }
    ),
    wmi: i18n.translate('xpack.securitySolution.endpoint.resolver.wmiEventTypeDisplayName', {
      defaultMessage: 'WMI',
    }),
    api: i18n.translate('xpack.securitySolution.endpoint.resolver.apiEventTypeDisplayName', {
      defaultMessage: 'API',
    }),
    user: i18n.translate('xpack.securitySolution.endpoint.resolver.userEventTypeDisplayName', {
      defaultMessage: 'User',
    }),
  };
  return (
    displayNameRecord[schemaName] ||
    i18n.translate('xpack.securitySolution.endpoint.resolver.userEventTypeDisplayUnknown', {
      defaultMessage: 'Unknown',
    })
  );
};

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
  left: 26%;
  line-height: 140%;
  padding: 0.25rem 0 0 0.1rem;
  position: absolute;
  top: ${(props) => `${props.topPct}%`};
  width: auto;
`;

interface StyledDescriptionText {
  readonly backgroundColor: string;
  readonly color: string;
}

const StyledDescriptionText = styled.div<StyledDescriptionText>`
  text-transform: uppercase;
  letter-spacing: -0.01px;
  background-color: ${(props) => props.backgroundColor};
  line-height: 1;
  font-weight: bold;
  font-size: 0.8rem;
  width: fit-content;
  margin: 0;
  text-align: left;
  padding: 4px 0 0 2px;
  color: ${(props) => props.color};
`;

/**
 * An artifact that represents a process node and the things associated with it in the Resolver
 */
const ProcessEventDotComponents = React.memo(
  ({
    className,
    position,
    event,
    projectionMatrix,
    adjacentNodeMap,
    relatedEventsStats,
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
    /**
     * Statistics for the number of related events and alerts for this process node
     */
    relatedEventsStats?: ResolverNodeStats;
  }) => {
    /**
     * Convert the position, which is in 'world' coordinates, to screen coordinates.
     */
    const [left, top] = applyMatrix3(position, projectionMatrix);

    const [magFactorX] = projectionMatrix;

    const selfId = adjacentNodeMap.self;

    const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
    const selectedDescendantId = useSelector(selectors.uiSelectedDescendantId);

    const logicalProcessNodeViewWidth = 360;
    const logicalProcessNodeViewHeight = 120;
    /**
     * The `left` and `top` values represent the 'center' point of the process node.
     * Since the view has content to the left and above the 'center' point, offset the
     * position to accomodate for that. This aligns the logical center of the process node
     * with the correct position on the map.
     */
    const isZoomedOut = magFactorX < 0.95;
    const isShowingDescriptionText = magFactorX >= 0.55;

    const nodeXOffsetValue = isZoomedOut
      ? -0.177413 + (-magFactorX * (1 - magFactorX)) / 5
      : -0.172413;
    const nodeYOffsetValue = isZoomedOut
      ? -0.73684 + (-magFactorX * 0.5 * (1 - magFactorX)) / magFactorX
      : -0.73684;

    const actionsBaseYOffsetPct = 30;
    let actionsYOffsetPct;
    switch (true) {
      case !isZoomedOut:
        actionsYOffsetPct = actionsBaseYOffsetPct + 3.5 * magFactorX;
        break;
      case isShowingDescriptionText:
        actionsYOffsetPct = actionsBaseYOffsetPct + magFactorX;
        break;
      default:
        actionsYOffsetPct = actionsBaseYOffsetPct + 21 * magFactorX;
        break;
    }

    const processNodeViewXOffset = nodeXOffsetValue * logicalProcessNodeViewWidth * magFactorX;
    const processNodeViewYOffset = nodeYOffsetValue * logicalProcessNodeViewHeight * magFactorX;

    const nodeViewportStyle = useMemo(
      () => ({
        left: `${left + processNodeViewXOffset}px`,
        top: `${top + processNodeViewYOffset}px`,
        // Width of symbol viewport scaled to fit
        width: `${logicalProcessNodeViewWidth * magFactorX}px`,
        // Height according to symbol viewbox AR
        height: `${logicalProcessNodeViewHeight * magFactorX}px`,
      }),
      [left, magFactorX, processNodeViewXOffset, processNodeViewYOffset, top]
    );

    /**
     * Type in non-SVG components scales as follows:
     *  (These values were adjusted to match the proportions in the comps provided by UX/Design)
     *  18.75 : The smallest readable font size at which labels/descriptions can be read. Font size will not scale below this.
     *  12.5 : A 'slope' at which the font size will scale w.r.t. to zoom level otherwise
     */
    const scaledTypeSize = calculateResolverFontSize(magFactorX, 18.75, 12.5);

    const markerBaseSize = 15;
    const markerSize = markerBaseSize;
    const markerPositionYOffset = -markerBaseSize / 2 + 3; // + 3 to align nodes centrally on edge
    const markerPositionXOffset = -markerBaseSize / 2;

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
    const { colorMap, nodeAssets } = useResolverTheme();
    const {
      backingFill,
      cubeSymbol,
      descriptionText,
      isLabelFilled,
      labelButtonFill,
      strokeColor,
    } = nodeAssets[nodeType(event)];
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

    const handleFocus = useCallback(() => {
      dispatch({
        type: 'userFocusedOnResolverNode',
        payload: {
          nodeId,
        },
      });
    }, [dispatch, nodeId]);

    const handleClick = useCallback(() => {
      if (animationTarget.current !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (animationTarget.current as any).beginElement();
      }
      dispatch({
        type: 'userSelectedResolverNode',
        payload: {
          nodeId,
        },
      });
    }, [animationTarget, dispatch, nodeId]);

    useEffect(() => {
      dispatch({
        type: 'userRequestedRelatedEventData',
        payload: event,
      });
    }, [dispatch, event]);

    const handleRelatedAlertsRequest = useCallback(() => {
      dispatch({
        type: 'userSelectedRelatedAlerts',
        payload: event,
      });
    }, [dispatch, event]);
    /**
     * Enumerates the stats for related events to display with the node as options,
     * generally in the form `number of related events in category` `category title`
     * e.g. "10 DNS", "230 File"
     */
    const [isShowingRelatedEvents, updateIsShowingRelatedEvents] = useState(false);
    const relatedEventOptions = useMemo(() => {
      if (!relatedEventsStats) {
        // Return an empty set of options if there are no stats to report
        return [];
      }
      // If we have entries to show, map them into options to display in the selectable list
      return Object.entries(relatedEventsStats.events.byCategory).map(([category, total]) => {
        const displayName = getDisplayName(category);
        return {
          prefix: <EuiI18nNumber value={total || 0} />,
          optionTitle: `${displayName}`,
          action: () => {
            dispatch({
              type: 'userSelectedRelatedEventCategory',
              payload: {
                subject: event,
                category,
              },
            });
          },
        };
      });
    }, [relatedEventsStats, dispatch, event]);

    const relatedEventStatusOrOptions = (() => {
      if (!relatedEventsStats) {
        return subMenuAssets.initialMenuStatus;
      }

      return relatedEventOptions;
    })();

    /* eslint-disable jsx-a11y/click-events-have-key-events */
    /**
     * Key event handling (e.g. 'Enter'/'Space') is provisioned by the `EuiKeyboardAccessible` component
     */
    return (
      <EuiKeyboardAccessible>
        <div
          data-test-subj={'resolverNode'}
          className={`${className} kbn-resetFocusState`}
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
                fill={backingFill} // Only visible on hover
                x={-11.35}
                y={-8.35}
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
                  begin="click"
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
            topPct={actionsYOffsetPct}
          >
            {isShowingDescriptionText && (
              <StyledDescriptionText
                backgroundColor={colorMap.resolverBackground}
                color={colorMap.descriptionText}
              >
                {descriptionText}
              </StyledDescriptionText>
            )}
            <div
              style={{
                backgroundColor: colorMap.resolverBackground,
                alignSelf: 'flex-start',
                padding: 0,
              }}
            >
              <EuiButton
                color={labelButtonFill}
                data-test-subject="nodeLabel"
                fill={isLabelFilled}
                id={labelId}
                size="s"
                style={{
                  maxHeight: `${Math.min(26 + magFactorX * 3, 32)}px`,
                  maxWidth: `${Math.min(150 * magFactorX, 400)}px`,
                }}
                tabIndex={-1}
              >
                <span className="euiButton__content">
                  <span className="euiButton__text" data-test-subj={'euiButton__text'}>
                    {eventModel.eventName(event)}
                  </span>
                </span>
              </EuiButton>
            </div>
            {!isZoomedOut && (
              <EuiFlexGroup
                justifyContent="flexStart"
                gutterSize="xs"
                style={{
                  background: colorMap.resolverBackground,
                  alignSelf: 'flex-start',
                  padding: 0,
                  margin: 0,
                }}
              >
                {isShowingRelatedEvents && (
                  <EuiFlexItem grow={false} className="related-dropdown">
                    <NodeSubMenu
                      buttonBorderColor={labelButtonFill}
                      buttonFill={colorMap.resolverBackground}
                      menuTitle={subMenuAssets.relatedEvents.title}
                      optionsWithActions={relatedEventStatusOrOptions}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <NodeSubMenu
                    buttonBorderColor={labelButtonFill}
                    buttonFill={colorMap.resolverBackground}
                    menuTitle={subMenuAssets.relatedAlerts.title}
                    menuAction={handleRelatedAlertsRequest}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </StyledActionsContainer>
        </div>
      </EuiKeyboardAccessible>
    );
    /* eslint-enable jsx-a11y/click-events-have-key-events */
  }
);

ProcessEventDotComponents.displayName = 'ProcessEventDot';

export const ProcessEventDot = styled(ProcessEventDotComponents)`
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

const processTypeToCube: Record<ResolverProcessType, keyof NodeStyleMap> = {
  processCreated: 'runningProcessCube',
  processRan: 'runningProcessCube',
  processTerminated: 'terminatedProcessCube',
  unknownProcessEvent: 'runningProcessCube',
  processCausedAlert: 'runningTriggerCube',
  unknownEvent: 'runningProcessCube',
};

function nodeType(processEvent: ResolverEvent): keyof NodeStyleMap {
  const processType = processModel.eventType(processEvent);

  if (processType in processTypeToCube) {
    return processTypeToCube[processType];
  }
  return 'runningProcessCube';
}
