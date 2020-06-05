/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useMemo, useContext } from 'react';
import {
  EuiPanel,
  EuiBadge,
  EuiBasicTableColumn,
  EuiTitle,
  EuiHorizontalRule,
  EuiInMemoryTable,
} from '@elastic/eui';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { SideEffectContext } from './side_effect_context';
import { ResolverEvent } from '../../../common/endpoint/types';
import * as event from '../../../common/endpoint/models/event';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as selectors from '../store/selectors';
import { useHistory } from 'react-router-dom';
// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { displayNameRecord } from './process_event_dot';
import { hostPidForProcess, hostParentPidForProcess, hostPathForProcess, userInfoForProcess } from '../models/process_event';
import { EuiDescriptionList } from '@elastic/eui';

const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const ProcessListWithCounts = memo(function ProcessListWithCounts() {
  interface ProcessTableView {
    name: string;
    timestamp?: Date;
    event: ResolverEvent;
  }

  const dispatch = useResolverDispatch();
  const { timestamp } = useContext(SideEffectContext);
  const handleBringIntoViewClick = useCallback(
    (processTableViewItem) => {
      dispatch({
        type: 'userBroughtProcessIntoView',
        payload: {
          time: timestamp(),
          process: processTableViewItem.event,
        },
      });
    },
    [dispatch, timestamp]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ProcessTableView>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.processNameTitle', {
          defaultMessage: 'Process Name',
        }),
        sortable: true,
        truncateText: true,
        render(name: string) {
          return name === '' ? (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.siem.endpoint.resolver.panel.table.row.valueMissingDescription',
                {
                  defaultMessage: 'Value is missing',
                }
              )}
            </EuiBadge>
          ) : (
            name
          );
        },
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.timestampTitle', {
          defaultMessage: 'Timestamp',
        }),
        dataType: 'date',
        sortable: true,
        render(eventDate?: Date) {
          return eventDate ? (
            formatter.format(eventDate)
          ) : (
            <EuiBadge color="warning">
              {i18n.translate(
                'xpack.siem.endpoint.resolver.panel.table.row.timestampInvalidLabel',
                {
                  defaultMessage: 'invalid',
                }
              )}
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.actionsTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate(
              'xpack.siem.endpoint.resolver.panel.table.row.actions.bringIntoViewButtonLabel',
              {
                defaultMessage: 'Bring into view',
              }
            ),
            description: i18n.translate(
              'xpack.siem.endpoint.resolver.panel.table.row.bringIntoViewLabel',
              {
                defaultMessage: 'Bring the process into view on the map.',
              }
            ),
            type: 'icon',
            icon: 'flag',
            onClick: handleBringIntoViewClick,
          },
        ],
      },
    ],
    [formatter, handleBringIntoViewClick]
  );

  const { processNodePositions } = useSelector(selectors.processNodePositionsAndEdgeLineSegments);
  const processTableView: ProcessTableView[] = useMemo(
    () =>
      [...processNodePositions.keys()].map((processEvent) => {
        let dateTime;
        const eventTime = event.eventTimestamp(processEvent);
        const name = event.eventName(processEvent);
        if (eventTime) {
          const date = new Date(eventTime);
          if (isFinite(date.getTime())) {
            dateTime = date;
          }
        }
        return {
          name,
          timestamp: dateTime,
          event: processEvent,
        };
      }),
    [processNodePositions]
  );

  return (
    <>
    <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.siem.endpoint.resolver.panel.title', {
            defaultMessage: 'Events',
          })}
        </h4>
      </EuiTitle>
      <HorizontalRule />
    <EuiInMemoryTable<ProcessTableView> items={processTableView} columns={columns} sorting />
  </>
  )
});

const ProcessDetails = memo(function ProcessListWithCounts() {
  const { processNodePositions } = useSelector(selectors.processNodePositionsAndEdgeLineSegments);
  const selectedDescendantProcessId = useSelector(selectors.uiSelectedDescendantProcessId);
  const [processEvent] = useMemo(()=>{
    return [...processNodePositions.keys()].filter(processEvent=>event.entityId(processEvent)===selectedDescendantProcessId);  
  },[]);
  const processName = processEvent && event.eventName(processEvent);
  const processInfoEntry = useMemo(() =>{
    let dateTime = '';
    const eventTime = processEvent && event.eventTimestamp(processEvent);
    if (eventTime) {
      const date = new Date(eventTime);
      if (isFinite(date.getTime())) {
        dateTime = formatter.format(date);
      }
    }

    const processInfo = processEvent ? {
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.created', {
        defaultMessage: 'Created',
      })]: dateTime,
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.path', {
        defaultMessage: 'Path',
      })]: hostPathForProcess(processEvent),
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.pid', {
        defaultMessage: 'PID',
      })]: hostPidForProcess(processEvent),
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.name', {
        defaultMessage: 'Name',
      })]: processName,
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.parentPid', {
        defaultMessage: 'Parent PID',
      })]: hostParentPidForProcess(processEvent),
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.user', {
        defaultMessage: 'User',
      })]: (userInfoForProcess(processEvent) as {name: string, domain: string}).name,
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.domain', {
        defaultMessage: 'Domain',
      })]: (userInfoForProcess(processEvent) as {name: string, domain: string}).name,
    } : {};

    return Object.entries(processInfo)
      .filter(([,description])=>{ return description })
      .map(([title,description])=>{ 
        return {title, description: String(description)}
      });
  }, [processNodePositions,selectedDescendantProcessId,processEvent]);
  console.log(processInfoEntry);
  return (
    <>
    <EuiTitle size="xs">
        <h4>
          {processName}
        </h4>
    </EuiTitle>
    <HorizontalRule />
    <EuiDescriptionList type="responsiveColumn" listItems={processInfoEntry} />
    </>
  )
});

const PanelContent = memo(function PanelContent() {
  const history = useHistory();
  const urlSearch = location.search;
  const queryParams: {readonly crumbId: string, readonly crumbEvent: string} = useMemo(() => { 
    return Object.assign({crumbId: '', crumbEvent: ''}, querystring.parse(urlSearch.slice(1)))},
  [urlSearch]);
  
  const graphableProcesses = useSelector(selectors.graphableProcesses);
  const relatedEvents = useSelector(selectors.relatedEvents);
  /**
   * Determine which set of breadcrumbs to display based on the query parameters
   * for the table & breadcrumb nav
   */
  const whichTableViewAndBreadcrumbsToRender = useMemo(()=>{
    const graphableProcessEntityIds = new Set(graphableProcesses.map(event.entityId));
    const {crumbId, crumbEvent} = queryParams;
    if(graphableProcessEntityIds.has(crumbEvent)){
      const processSubject = graphableProcesses.find(evt=>event.entityId(evt)===crumbEvent);
      if(!processSubject){
        //should never happen, but bail out to default
        return console.log('default'), (<ProcessListWithCounts />);
      }
      const relatedEventsState = relatedEvents.get(processSubject)!;
      if(relatedEventsState === 'waitingForRelatedEventData'){
        //Related event data hasn't been fetched for this process yet:
        //The UI around the menu should dispatch the /events effect for this.
        return console.log('waiting'),'waiting';
      }
      if(relatedEventsState === 'error'){
        //return as error if there was a service error requesting the /events
        return console.log('serviceError'),'serviceError';
      }
      if(typeof relatedEventsState === 'object'){
        const eventFromCrumbId = relatedEventsState.relatedEvents.find(
          ({relatedEvent})=>{
            return event.entityId(relatedEvent) === crumbId 
          }
        )
        if(!eventFromCrumbId){
          //Return an indication that it no longer exists (it may have been removed/purged/etc.)
          return console.log('relatedEventDNE'),'relatedEventDNE';
        }
        return console.log('relatedEventDetail'),'relatedEventDetail';
      }
    }
    else if(graphableProcessEntityIds.has(crumbId)) {
      if(crumbEvent === ''){
        //If there is no crumbEvent param, it's for the process detail
        //Note: this view should handle its own effect for requesting /events
        return console.log('processDetail'), <ProcessDetails />;
      }
      if(crumbEvent === 'all'){
        //If crumbEvent param is the special `all`, it's for the view that shows the counts for all a particulat process' related events.
        //Note: this view should handle its own effect for requesting /events
        return console.log('processEventList'),'processEventList';
      }
      if(crumbEvent in displayNameRecord){
        //If crumbEvent is one of the known event types, it's for a related event view narrowed by that type
        return console.log('processEventListNarrowedByType'),'processEventListNarrowedByType';
      }
    }
    //The default 'Event List' / 'List of all processes' view
    return console.log('default'),(<ProcessListWithCounts />);
  },[queryParams,graphableProcesses,relatedEvents]);

  /**
   * This updates the breadcrumb nav, the table view and URL history
   */
  const updateCrumbs = useCallback(
    (newCrumbs: typeof queryParams) => {
      const newQueryParms = {...queryParams, ...newCrumbs};
      const relativeURL = {search: querystring.stringify(newQueryParms)};
      return history.push(relativeURL);
    },
    [history, queryParams]
  );

  console.log(queryParams);

  return (
    <>{whichTableViewAndBreadcrumbsToRender}</>
  )
});

const HorizontalRule = memo(function HorizontalRule() {
  return (
    <EuiHorizontalRule
      style={{
        /**
         * Cannot use `styled` to override this because the specificity of EuiHorizontalRule's
         * CSS selectors is too high.
         */
        marginLeft: `-${euiVars.euiPanelPaddingModifiers.paddingMedium}`,
        marginRight: `-${euiVars.euiPanelPaddingModifiers.paddingMedium}`,
        /**
         * The default width is 100%, but this should be greater.
         */
        width: 'auto',
      }}
    />
  );
});

export const Panel = memo(function Event({ className }: { className?: string }) {
  return (
    <EuiPanel className={className}>
      <PanelContent />
    </EuiPanel>
  );
});
