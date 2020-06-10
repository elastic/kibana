/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useMemo, useContext, useLayoutEffect, useEffect, useState } from 'react';
import {
  EuiPanel,
  EuiBadge,
  EuiBasicTableColumn,
  EuiTitle,
  EuiInMemoryTable,
} from '@elastic/eui';
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
import { displayNameRecord, cubeAssetsForNode } from './process_event_dot';
import { hostPidForProcess, hostParentPidForProcess, hostPathForProcess, userInfoForProcess, md5HashForProcess, argsForProcess } from '../models/process_event';
import { EuiDescriptionList } from '@elastic/eui';
import { htmlIdGenerator } from '@elastic/eui';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import { EuiTextColor } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiBreadcrumbs } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { RelatedEventDataEntryWithStats } from '../types';
import { EuiI18nNumber } from '@elastic/eui';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { EuiHorizontalRule } from '@elastic/eui';

/**
 * The two query parameters we read/write on
 */
interface crumbInfo {
  readonly crumbId: string;
  readonly crumbEvent: string;
}

const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function formatDate(timestamp: ConstructorParameters<typeof Date>[0]) {  
  const date = new Date(timestamp);
  if (isFinite(date.getTime())) {
    return formatter.format(date)
  }
  else {
    return 'Invalid Date';
  }
}

const BoldCode = styled(EuiCode)`
  &.euiCodeBlock code.euiCodeBlock__code {
    font-weight: 900;
  }
`

/**
 * During user testing, one user indicated they wanted to see stronger visual relationships between
 * Nodes on the graph and what's in the table. Using the same symbol in both places (as below) could help with that.
 */
const CubeForProcess = memo(function CubeForProcess({processEvent}: {processEvent: ResolverEvent}){
  const { cubeSymbol, descriptionText } = useMemo(()=>{
    if(!processEvent){
      return {cubeSymbol: undefined, descriptionText: undefined}
    }
    return cubeAssetsForNode(processEvent);
  },
  [processEvent]);

  return (<>
  <svg style={{position: 'relative', top: '0.4em', marginRight: '.25em'}} className="table-process-icon" width="1.5em" height="1.5em" viewBox="0 0 1 1">
    <desc>{descriptionText}</desc>
    <use
      role="presentation"
      xlinkHref={cubeSymbol}
      x={0}
      y={0}
      width={1}
      height={1}
      opacity="1"
      className="cube"
    />
  </svg>
  </>)
});

const TableServiceError = memo(function({errorMessage, pushToQueryParams}: {
  errorMessage: string;
  pushToQueryParams: (arg0: crumbInfo)=>unknown;
}){
  const crumbs = useMemo(()=>{
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.error.events', {
          defaultMessage: 'Events',
        }),
        onClick: ()=>{ pushToQueryParams({crumbId: '', crumbEvent: ''}) },
      },
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.error.error', {
          defaultMessage: 'Error',
        }),
        onClick: ()=>{},
      },
    ]
  },[]);
  return (
  <>
    <EuiBreadcrumbs breadcrumbs={crumbs} />
    <EuiSpacer  size="l" />
  </>)
})

/**
 * Display a waiting message to the user when we can't display what they requested because we don't have related event data yet.
 * If the related event data has not been requested yet (reflected by `relatedEventsState` being undefined) then issue a request.
 */
const WaitForRelatedEvents = memo(function({processEvent, relatedEventsState}: {processEvent: ResolverEvent, relatedEventsState: 'waitingForRelatedEventData' | undefined}) {
  const dispatch = useResolverDispatch();
  useEffect(() => {
    console.log('running effect');
     if(processEvent) {
      //Don't request again if it's already waiting
      relatedEventsState !== 'waitingForRelatedEventData' && dispatch({
        type: 'userRequestedRelatedEventData',
        payload: processEvent,
      });
     }
  }, [dispatch, processEvent]);
  const crumbs = useMemo(()=>{
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.waiting.events', {
          defaultMessage: 'Events',
        }),
        onClick: ()=>{},
      },
    ]
  },[])
  return (
    <>
      <EuiBreadcrumbs breadcrumbs={crumbs} />
      <EuiText textAlign="center">
        <div role="presentation"><EuiLoadingSpinner /></div>
        {
        i18n.translate('xpack.siem.endpoint.resolver.panel.waiting.waiting', {
          defaultMessage: 'Waiting For Related Events...',
        })
        }
      </EuiText>
    </>
  )
});

/**
 * This view presents a list of related events of a given type for a given process.
 * It will appear like:
 * 
 * |                                                        |
 * | :----------------------------------------------------- |
 * | **registry deletion** @ *3:32PM..* *HKLM/software...*  |
 * | **file creation** @ *3:34PM..* *C:/directory/file.exe* |
 */
const ProcessEventListNarrowedByType = memo(function ProcessEventListNarrowedByType({processEvent, eventType, relatedEventsState, pushToQueryParams}: {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: crumbInfo)=>unknown;
  eventType: string;
  relatedEventsState: RelatedEventDataEntryWithStats;
}){
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  const totalCount = Object.values(relatedEventsState.stats).reduce((a,v)=>{ return a + v }, 0);
  const eventsString = i18n.translate('xpack.siem.endpoint.resolver.panel.processEventListByType.events', {
    defaultMessage: 'Events',
  });
  const matchingEvents = useMemo(() =>{
      return relatedEventsState.relatedEvents.reduce((a: ResolverEvent[] ,{relatedEvent, relatedEventType})=>{
        relatedEventType === eventType && a.push(relatedEvent)
        return a
      },[]).map((resolverEvent)=>{
        const eventTime = event.eventTimestamp(resolverEvent);
        const formattedDate = typeof eventTime === 'undefined' ? '' : formatDate(eventTime); 
        return {
          formattedDate,
          eventType: eventType + ' ' + event.ecsEventType(resolverEvent),
          name: event.descriptiveName(resolverEvent),
        }
      })
    },
  [relatedEventsState, eventType]);
  const crumbs = useMemo(()=>{
    return [
      {
        text: eventsString,
        onClick: ()=>{ pushToQueryParams({crumbId: '', crumbEvent: ''}) },
      },
      {
        text: processName,
        onClick: ()=>{ pushToQueryParams({crumbId: processEntityId, crumbEvent: ''}) }
      },
      {
        text: <><EuiI18nNumber value={totalCount} />{/*Non-breaking space->*/` ${eventsString}`}</>,
        onClick: ()=>{ pushToQueryParams({crumbId: processEntityId, crumbEvent: 'all'}) }
      },
      {
        text: <><EuiI18nNumber value={matchingEvents.length} />{/*Non-breaking space->*/` ${eventType}`}</>,
        onClick: ()=>{}
      }
    ]
  },[]);
  return (<>
    <EuiBreadcrumbs breadcrumbs={crumbs} />
    <EuiSpacer  size="l" />
    <>
      {matchingEvents.map((eventView, index)=>{
        return (
          <>
            <EuiText><BoldCode>{eventView.eventType}</BoldCode>{' @ '}{eventView.formattedDate}</EuiText>
            <EuiSpacer  size="xs" />
            <EuiButtonEmpty onClick={()=>{}}>{eventView.name}</EuiButtonEmpty>
            {index === matchingEvents.length - 1 ? null : (<EuiHorizontalRule margin="m" />)}
          </>
        )
      })}
    </>
  </>)
});

/**
 * This view gives counts for all the related events of a process grouped by related event type.
 * It should look something like:
 * 
 * | Count                  | Event Type                 |
 * | :--------------------- | :------------------------- |
 * | 5                      | DNS                        |
 * | 12                     | Registry                   |
 * | 2                      | Network                    |
 * 
 */
const EventCountsForProcess = memo(function EventCountsForProcess({processEvent, pushToQueryParams, relatedEventsState} : {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: crumbInfo)=>unknown;
  relatedEventsState: RelatedEventDataEntryWithStats;
}) {
  interface EventCountsTableView {
    name: string;
    count: number;
  }
  
  const processName = processEvent && event.eventName(processEvent);
  const processEntityId = event.entityId(processEvent);
  const totalCount = Object.values(relatedEventsState.stats).reduce((a,v)=>{ return a + v }, 0);
  const eventsString = i18n.translate('xpack.siem.endpoint.resolver.panel.processEventCounts.events', {
    defaultMessage: 'Events',
  });
  const crumbs = useMemo(()=>{
    return [
      {
        text: eventsString,
        onClick: ()=>{ pushToQueryParams({crumbId: '', crumbEvent: ''}) },
      },
      {
        text: processName,
        onClick: ()=>{ pushToQueryParams({crumbId: processEntityId, crumbEvent: ''}) }
      },
      {
        text: <><EuiI18nNumber value={totalCount} />{/*Non-breaking space->*/` ${eventsString}`}</>,
        onClick: ()=>{ pushToQueryParams({crumbId: processEntityId, crumbEvent: ''}) }
      }
    ]
  },[]);
  const rows = useMemo(()=>{
    return Object.entries(relatedEventsState.stats).map(([eventType, count]): EventCountsTableView => { 
      return {
        name: eventType,
        count,
      }
    });
  },[relatedEventsState]);
  const columns = useMemo<Array<EuiBasicTableColumn<EventCountsTableView>>>(
    () => [
      {
        field: 'count',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.count', {
          defaultMessage: 'Count',
        }),
        width: '20%',
        sortable: true,
      },
      {
        field: 'name',
        name: i18n.translate('xpack.siem.endpoint.resolver.panel.table.row.eventType', {
          defaultMessage: 'Event Type',
        }),
        width: '80%',
        sortable: true,
        render(name: string) {
          return (<EuiButtonEmpty onClick={()=>{ 
            pushToQueryParams({crumbId: event.entityId(processEvent), crumbEvent: name});
          }}>{name}</EuiButtonEmpty>)
        },
      }]
  ,[])
  return (
    <>
      <EuiBreadcrumbs breadcrumbs={crumbs} />
      <EuiSpacer size="l" />
      <EuiInMemoryTable<EventCountsTableView> items={rows} columns={columns} sorting />
    </>
   )
  });
  


const ProcessListWithCounts = memo(function ProcessListWithCounts({pushToQueryParams}: {
  pushToQueryParams: (arg0: crumbInfo)=>unknown
}) {
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
      pushToQueryParams({crumbId: event.entityId(processTableViewItem.event), crumbEvent: ''});
    },
    [dispatch, timestamp, pushToQueryParams]
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
        render(name: string, item: ProcessTableView) {
          
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
            <EuiButtonEmpty onClick={()=>{ 
                handleBringIntoViewClick(item)
                pushToQueryParams({crumbId: event.entityId(item.event), crumbEvent: ''});
              }}>
              <CubeForProcess processEvent={item.event}/>
              {name}
            </EuiButtonEmpty>
          )
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

  const crumbs = useMemo(()=>{
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.processListWithCounts.events', {
          defaultMessage: 'Events',
        }),
        onClick: ()=>{},
      },
    ]
  },[])

  return (
    <>
    <EuiBreadcrumbs breadcrumbs={crumbs} />
    <EuiSpacer size="l" />
    <EuiInMemoryTable<ProcessTableView> items={processTableView} columns={columns} sorting />
  </>
  )
});

const StyledDescriptionList = styled(EuiDescriptionList)`
  &.euiDescriptionList.euiDescriptionList--column dt.euiDescriptionList__title.desc-title {
    max-width: 8em;
  }
`;

/**
 * A description list view of all the Metadata that goes with a particular process event, like:
 * Created, Pid, User/Domain, etc.
 */
const ProcessDetails = memo(function ProcessListWithCounts({processEvent, pushToQueryParams} : {
  processEvent: ResolverEvent;
  pushToQueryParams: (arg0: crumbInfo)=>unknown
}) {
  console.log('rendering process details');
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
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.user', {
        defaultMessage: 'User',
      })]: (userInfoForProcess(processEvent) as {name: string, domain: string}).name,
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.domain', {
        defaultMessage: 'Domain',
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.parentPid', {
        defaultMessage: 'Parent PID',
      })]: hostParentPidForProcess(processEvent),
      })]: (userInfoForProcess(processEvent) as {name: string, domain: string}).domain,
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.md5hash', {
        defaultMessage: 'MD5',
      })]: md5HashForProcess(processEvent),
      [i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.commandLine', {
        defaultMessage: 'Command Line',
      })]: argsForProcess(processEvent),
    } : {};

    return Object.entries(processInfo)
      .filter(([,description])=>{ return description })
      .map(([title,description])=>{ 
        return {title, description: String(description)}
      });
  }, [processEvent]);
  
  const crumbs = useMemo(()=>{
    return [
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.events', {
          defaultMessage: 'Events',
        }),
        onClick: ()=>{ pushToQueryParams({crumbId: '', crumbEvent: ''}) },
      },
      {
        text: i18n.translate('xpack.siem.endpoint.resolver.panel.processDescList.details', {
          defaultMessage: 'Details for: ',
        }) + processName,
        onClick: ()=>{}
      }
    ]
  },[])
  const { descriptionText } = useMemo(()=>{
    if(!processEvent){
      return {descriptionText: ''}
    }
    return cubeAssetsForNode(processEvent);
  },
  [processEvent]);

  const titleId = useMemo(() => htmlIdGenerator('resolverTable')(), []);
  return (
    <>
    <EuiBreadcrumbs breadcrumbs={crumbs} />
    <EuiSpacer size="l" />
    <EuiTitle size="xs">
        <h4 id={titleId}>
          <CubeForProcess processEvent={processEvent} />
          {processName}
        </h4>
    </EuiTitle>
    <EuiText>
        <EuiTextColor color="subdued"><span aria-describes={titleId}>{descriptionText}</span></EuiTextColor>
    </EuiText>
    <EuiSpacer size="l" />
    <StyledDescriptionList type="column" align="left" titleProps={{className: 'desc-title'}} compressed listItems={processInfoEntry} />
    </>
  )
})


/**
   * The team decided to use this determinant to express how we comport state in the UI with the values of the two query params:
   * 
   * | Crumb&Table            | &crumbId                   | &crumbEvent              |
   * | :--------------------- | :------------------------- | :----------------------  |
   * | all processes/default  | null                       | null                     |
   * | process detail         | entity_id of process       | null                     |
   * | relateds count by type | entity_id of process       | 'all'                    |
   * | relateds list 1 type   | entity_id of process       | valid related event type |
   * | related event detail   | entity_id of related event | entity_id of process     |
   * 
   * This component implements the strategy laid out above by determining the "right" view and doing some other housekeeping e.g. effects to keep the UI-selected node in line with what's indicated by the URL parameters.
   */
const PanelContent = memo(function PanelContent() {
  const history = useHistory();
  const urlSearch = history.location.search;
  const queryParams: {readonly crumbId: string, readonly crumbEvent: string} = useMemo(() => { 
    return Object.assign({crumbId: '', crumbEvent: ''}, querystring.parse(urlSearch.slice(1)))},
  [urlSearch]);

  const selectedDescendantProcessId = useSelector(selectors.uiSelectedDescendantProcessId);
  const graphableProcesses = useSelector(selectors.graphableProcesses);
  const dispatch = useResolverDispatch();
  
  const idFromParams = useMemo(()=>{
    const graphableProcessEntityIds = new Set(graphableProcesses.map(event.entityId));
    return (graphableProcessEntityIds.has(queryParams.crumbId) && queryParams.crumbId) || (graphableProcessEntityIds.has(queryParams.crumbEvent) && queryParams.crumbEvent);
  },[graphableProcesses, queryParams]);

  const uiSelectedEvent = useMemo(()=>{
    return graphableProcesses.find(evt=>event.entityId(evt)===selectedDescendantProcessId);
  },[graphableProcesses, selectedDescendantProcessId]);

  const paramsSelectedEvent = useMemo(()=>{
    return graphableProcesses.find(evt=>event.entityId(evt)===idFromParams);
  },[graphableProcesses, idFromParams]);
  const { timestamp } = useContext(SideEffectContext);
  const [lastUpdatedProcess, setLastUpdatedProcess] = useState<null | ResolverEvent>(null);
  /**
   * When the ui-selected node is _not_ the one indicated by the query params, but the id from params _is_ in the current tree,
   * dispatch a selection action to repair the UI to hold the query id as "selected".
   * This is to cover cases where users e.g. share links to reconstitute a Resolver state and it _should never run otherwise_ under the assumption that the query parameters are updated along with the selection in state
  */
  useLayoutEffect(() => {
    console.log({uiSelectedEvent, paramsSelectedEvent});
     //Check state to ensure we don't dispatch this in a way that causes cascading re-renders:
     if(paramsSelectedEvent && paramsSelectedEvent !== lastUpdatedProcess && paramsSelectedEvent !== uiSelectedEvent) {
      console.log('running layout effect');
      setLastUpdatedProcess(paramsSelectedEvent);
      dispatch({
        type: 'userBroughtProcessIntoView',
        payload: {
          time: timestamp(),
          process: paramsSelectedEvent,
        },
      });
     }
  }, [dispatch, uiSelectedEvent, paramsSelectedEvent]);

  /**
   * This updates the breadcrumb nav, the table view and URL history
   */
  const pushToQueryParams = useCallback(
    (newCrumbs: crumbInfo) => {
      console.log('push to query params');
      console.log(newCrumbs);
      //Construct a new set of params from the current set (minus the params)
      //by assigning the new set of params provided in `newCrumbs`
      const crumbsToPass = {
        ...querystring.parse(urlSearch.slice(1)),
        ...newCrumbs
      };
      crumbsToPass.crumbId === '' && delete crumbsToPass.crumbId;
      crumbsToPass.crumbEvent === '' && delete crumbsToPass.crumbEvent;
      const relativeURL = {search: querystring.stringify(crumbsToPass)};
      
      return history.replace(relativeURL);
    },
    [history, queryParams]
  );
  
  const relatedEvents = useSelector(selectors.relatedEvents);
  const {crumbId, crumbEvent} = queryParams;
  /**
   * Determine which set of breadcrumbs to display based on the query parameters
   * for the table & breadcrumb nav
   */
  const whichTableViewAndBreadcrumbsToRender = useMemo(()=>{
    const graphableProcessEntityIds = new Set(graphableProcesses.map(event.entityId));
    const relatedEventsState =  uiSelectedEvent && relatedEvents.get(uiSelectedEvent);
    console.log({crumbId, crumbEvent});
    if(graphableProcessEntityIds.has(crumbEvent)){
      if(!relatedEventsState || relatedEventsState === 'waitingForRelatedEventData'){
        //Related event data hasn't been fetched for this process yet:
        //The UI around the menu should dispatch the /events effect for this.
        if(uiSelectedEvent){
          return console.log('waiting'),<WaitForRelatedEvents relatedEventsState={relatedEventsState} processEvent={uiSelectedEvent} />;
        }
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
      if(!uiSelectedEvent){
        //should never happen, but bail out to default
        return console.log('default bail'), (<ProcessListWithCounts pushToQueryParams={pushToQueryParams} />);
      }
      if(crumbEvent === ''){
        //If there is no crumbEvent param, it's for the process detail
        //Note: this view should handle its own effect for requesting /events
        return console.log('processDetail'), <ProcessDetails processEvent={uiSelectedEvent} pushToQueryParams={pushToQueryParams} />;
      }
      console.log({relatedEventsState})
      if(!relatedEventsState || relatedEventsState === 'waitingForRelatedEventData') {
        //Related event data hasn't been fetched for this process yet:
        //All the components below this one _require_ related event data, so issue a request
        //and display a waiting state. 
        return console.log('waiting'), <WaitForRelatedEvents relatedEventsState={relatedEventsState} processEvent={uiSelectedEvent} />;
      }
      if(relatedEventsState === 'error'){
        //return as error if there was a service error requesting the /events
        return console.log('serviceError'),'serviceError';
      }
      if(crumbEvent === 'all' && relatedEventsState){
        //If crumbEvent param is the special `all`, it's for the view that shows the counts for all a particulat process' related events.
        //Note: this view should handle its own effect for requesting /events
        return console.log('processEventList'), <EventCountsForProcess processEvent={uiSelectedEvent} pushToQueryParams={pushToQueryParams} relatedEventsState={relatedEventsState} />;
      }
      if(crumbEvent in displayNameRecord){
        //If crumbEvent is one of the known event types, it's for a related event view narrowed by that type
        return console.log('processEventListNarrowedByType'),<ProcessEventListNarrowedByType processEvent={uiSelectedEvent} pushToQueryParams={pushToQueryParams} relatedEventsState={relatedEventsState} eventType={crumbEvent} />;
      }
    }
    //The default 'Event List' / 'List of all processes' view
    return console.log('default bottom'),(<ProcessListWithCounts pushToQueryParams={pushToQueryParams} />);
  },[queryParams,graphableProcesses,relatedEvents, uiSelectedEvent]);

  return (
    <>{whichTableViewAndBreadcrumbsToRender}</>
  )
});

export const Panel = memo(function Event({ className }: { className?: string }) {
  return (
    <EuiPanel className={className}>
      <PanelContent />
    </EuiPanel>
  );
});
