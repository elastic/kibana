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
  EuiI18nNumber,
  EuiKeyboardAccessible,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useSelector } from 'react-redux';
import { NodeSubMenu, subMenuAssets } from './submenu';
import { applyMatrix3 } from '../lib/vector2';
import {
  Vector2,
  Matrix3,
  AdjacentProcessMap,
  ResolverProcessType,
  RelatedEventEntryWithStatsOrWaiting,
} from '../types';
import { SymbolIds, NamedColors } from './defs';
import { ResolverEvent } from '../../../common/endpoint/types';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as eventModel from '../../../common/endpoint/models/event';
import * as processModel from '../models/process_event';
import * as selectors from '../store/selectors';

const nodeAssets = {
  runningProcessCube: {
    cubeSymbol: `#${SymbolIds.runningProcessCube}`,
    labelBackground: NamedColors.labelBackgroundRunningProcess,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.siem.endpoint.resolver.runningProcess', {
      defaultMessage: 'Running Process',
    }),
  },
  runningTriggerCube: {
    cubeSymbol: `#${SymbolIds.runningTriggerCube}`,
    labelBackground: NamedColors.labelBackgroundRunningTrigger,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.siem.endpoint.resolver.runningTrigger', {
      defaultMessage: 'Running Trigger',
    }),
  },
  terminatedProcessCube: {
    cubeSymbol: `#${SymbolIds.terminatedProcessCube}`,
    labelBackground: NamedColors.labelBackgroundTerminatedProcess,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.siem.endpoint.resolver.terminatedProcess', {
      defaultMessage: 'Terminated Process',
    }),
  },
  terminatedTriggerCube: {
    cubeSymbol: `#${SymbolIds.terminatedTriggerCube}`,
    labelBackground: NamedColors.labelBackgroundTerminatedTrigger,
    descriptionFill: NamedColors.empty,
    descriptionText: i18n.translate('xpack.siem.endpoint.resolver.terminatedTrigger', {
      defaultMessage: 'Terminated Trigger',
    }),
  },
};

/**
 * Take a gross `schemaName` and return a beautiful translated one.
 */
const getDisplayName: (schemaName: string) => string = function nameInSchemaToDisplayName(
  schemaName: string
) {
  const displayNameRecord: Record<string, string> = {
    application: i18n.translate('xpack.siem.endpoint.resolver.applicationEventTypeDisplayName', {
      defaultMessage: 'Application',
    }),
    apm: i18n.translate('xpack.siem.endpoint.resolver.apmEventTypeDisplayName', {
      defaultMessage: 'APM',
    }),
    audit: i18n.translate('xpack.siem.endpoint.resolver.auditEventTypeDisplayName', {
      defaultMessage: 'Audit',
    }),
    authentication: i18n.translate(
      'xpack.siem.endpoint.resolver.authenticationEventTypeDisplayName',
      {
        defaultMessage: 'Authentication',
      }
    ),
    certificate: i18n.translate('xpack.siem.endpoint.resolver.certificateEventTypeDisplayName', {
      defaultMessage: 'Certificate',
    }),
    cloud: i18n.translate('xpack.siem.endpoint.resolver.cloudEventTypeDisplayName', {
      defaultMessage: 'Cloud',
    }),
    database: i18n.translate('xpack.siem.endpoint.resolver.databaseEventTypeDisplayName', {
      defaultMessage: 'Database',
    }),
    driver: i18n.translate('xpack.siem.endpoint.resolver.driverEventTypeDisplayName', {
      defaultMessage: 'Driver',
    }),
    email: i18n.translate('xpack.siem.endpoint.resolver.emailEventTypeDisplayName', {
      defaultMessage: 'Email',
    }),
    file: i18n.translate('xpack.siem.endpoint.resolver.fileEventTypeDisplayName', {
      defaultMessage: 'File',
    }),
    host: i18n.translate('xpack.siem.endpoint.resolver.hostEventTypeDisplayName', {
      defaultMessage: 'Host',
    }),
    iam: i18n.translate('xpack.siem.endpoint.resolver.iamEventTypeDisplayName', {
      defaultMessage: 'IAM',
    }),
    iam_group: i18n.translate('xpack.siem.endpoint.resolver.iam_groupEventTypeDisplayName', {
      defaultMessage: 'IAM Group',
    }),
    intrusion_detection: i18n.translate(
      'xpack.siem.endpoint.resolver.intrusion_detectionEventTypeDisplayName',
      {
        defaultMessage: 'Intrusion Detection',
      }
    ),
    malware: i18n.translate('xpack.siem.endpoint.resolver.malwareEventTypeDisplayName', {
      defaultMessage: 'Malware',
    }),
    network_flow: i18n.translate('xpack.siem.endpoint.resolver.network_flowEventTypeDisplayName', {
      defaultMessage: 'Network Flow',
    }),
    network: i18n.translate('xpack.siem.endpoint.resolver.networkEventTypeDisplayName', {
      defaultMessage: 'Network',
    }),
    package: i18n.translate('xpack.siem.endpoint.resolver.packageEventTypeDisplayName', {
      defaultMessage: 'Package',
    }),
    process: i18n.translate('xpack.siem.endpoint.resolver.processEventTypeDisplayName', {
      defaultMessage: 'Process',
    }),
    registry: i18n.translate('xpack.siem.endpoint.resolver.registryEventTypeDisplayName', {
      defaultMessage: 'Registry',
    }),
    session: i18n.translate('xpack.siem.endpoint.resolver.sessionEventTypeDisplayName', {
      defaultMessage: 'Session',
    }),
    service: i18n.translate('xpack.siem.endpoint.resolver.serviceEventTypeDisplayName', {
      defaultMessage: 'Service',
    }),
    socket: i18n.translate('xpack.siem.endpoint.resolver.socketEventTypeDisplayName', {
      defaultMessage: 'Socket',
    }),
    vulnerability: i18n.translate(
      'xpack.siem.endpoint.resolver.vulnerabilityEventTypeDisplayName',
      {
        defaultMessage: 'Vulnerability',
      }
    ),
    web: i18n.translate('xpack.siem.endpoint.resolver.webEventTypeDisplayName', {
      defaultMessage: 'Web',
    }),
    alert: i18n.translate('xpack.siem.endpoint.resolver.alertEventTypeDisplayName', {
      defaultMessage: 'Alert',
    }),
    security: i18n.translate('xpack.siem.endpoint.resolver.securityEventTypeDisplayName', {
      defaultMessage: 'Security',
    }),
    dns: i18n.translate('xpack.siem.endpoint.resolver.dnsEventTypeDisplayName', {
      defaultMessage: 'DNS',
    }),
    clr: i18n.translate('xpack.siem.endpoint.resolver.clrEventTypeDisplayName', {
      defaultMessage: 'CLR',
    }),
    image_load: i18n.translate('xpack.siem.endpoint.resolver.image_loadEventTypeDisplayName', {
      defaultMessage: 'Image Load',
    }),
    powershell: i18n.translate('xpack.siem.endpoint.resolver.powershellEventTypeDisplayName', {
      defaultMessage: 'Powershell',
    }),
    wmi: i18n.translate('xpack.siem.endpoint.resolver.wmiEventTypeDisplayName', {
      defaultMessage: 'WMI',
    }),
    api: i18n.translate('xpack.siem.endpoint.resolver.apiEventTypeDisplayName', {
      defaultMessage: 'API',
    }),
    user: i18n.translate('xpack.siem.endpoint.resolver.userEventTypeDisplayName', {
      defaultMessage: 'User',
    }),
  };
  return (
    displayNameRecord[schemaName] ||
    i18n.translate('xpack.siem.endpoint.resolver.userEventTypeDisplayUnknown', {
      defaultMessage: 'Unknown',
    })
  );
};

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
    relatedEvents,
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
     * A collection of events related to the current node and statistics (e.g. counts indexed by event type)
     * to provide the user some visibility regarding the contents thereof.
     */
    relatedEvents?: RelatedEventEntryWithStatsOrWaiting;
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
    const processNodeViewXOffset = -0.172413 * logicalProcessNodeViewWidth * magFactorX;
    const processNodeViewYOffset = -0.73684 * logicalProcessNodeViewHeight * magFactorX;

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

    const handleRelatedEventRequest = useCallback(() => {
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
    const relatedEventOptions = useMemo(() => {
      if (relatedEvents === 'error') {
        // Return an empty set of options if there was an error requesting them
        return [];
      }
      const relatedStats = typeof relatedEvents === 'object' && relatedEvents.stats;
      if (!relatedStats) {
        // Return an empty set of options if there are no stats to report
        return [];
      }
      // If we have entries to show, map them into options to display in the selectable list
      return Object.entries(relatedStats).map((statsEntry) => {
        const displayName = getDisplayName(statsEntry[0]);
        return {
          prefix: <EuiI18nNumber value={statsEntry[1] || 0} />,
          optionTitle: `${displayName}`,
          action: () => {
            dispatch({
              type: 'userSelectedRelatedEventCategory',
              payload: {
                subject: event,
                category: statsEntry[0],
              },
            });
          },
        };
      });
    }, [relatedEvents, dispatch, event]);

    const relatedEventStatusOrOptions = (() => {
      if (!relatedEvents) {
        // If related events have not yet been requested
        return subMenuAssets.initialMenuStatus;
      }
      if (relatedEvents === 'error') {
        // If there was an error when we tried to request the events
        return subMenuAssets.menuError;
      }
      if (relatedEvents === 'waitingForRelatedEventData') {
        // If we're waiting for events to be returned
        // Pass on the waiting symbol
        return relatedEvents;
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
                <EuiFlexItem grow={false} className="related-dropdown">
                  <NodeSubMenu
                    menuTitle={subMenuAssets.relatedEvents.title}
                    optionsWithActions={relatedEventStatusOrOptions}
                    menuAction={handleRelatedEventRequest}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <NodeSubMenu
                    menuTitle={subMenuAssets.relatedAlerts.title}
                    menuAction={handleRelatedAlertsRequest}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
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
  }
  &[aria-current] .backing {
    transition-property: stroke-dashoffset;
    transition-duration: 1s;
    stroke-dashoffset: 0;
  }

  & .related-dropdown {
    width: 4.5em;
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

const processTypeToCube: Record<ResolverProcessType, keyof typeof nodeAssets> = {
  processCreated: 'runningProcessCube',
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
