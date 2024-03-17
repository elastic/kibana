/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import type { CSSProperties, ReactNode } from 'react';
import React, { useContext, createContext, memo, useEffect, useRef, useState } from 'react';
import type { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { ThemeContext } from 'styled-components';
// import { useTraceExplorerEnabledSetting } from '../../../hooks/use_trace_explorer_enabled_setting';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { EuiBasicTable, EuiPopover, EuiSearchBar } from '@elastic/eui';

import { getFlattenedObject } from '@kbn/std';
import { addProvider } from '../../../../store/actions';
import { getCytoscapeOptions } from './cytoscape_options';
import { useCytoscapeEventHandlers } from './use_cytoscape_event_handlers';
import type { DataProvider } from '../../data_providers/data_provider';
import { IS_OPERATOR } from '../../data_providers/data_provider';
import { useKibana } from '../../../../../common/lib/kibana/kibana_react';
cytoscape.use(dagre);

export function useTheme(): EuiTheme {
  const theme = useContext(ThemeContext);
  return theme;
}

export const CytoscapeContext = createContext<cytoscape.Core | undefined>(undefined);

export interface CytoscapeProps {
  children?: ReactNode;
  data: TimelineItem[];
  height: number;
  serviceName?: string;
  style?: CSSProperties;
  id: string;
}

function useCytoscape(options: cytoscape.CytoscapeOptions) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const ref = useRef(null);

  useEffect(() => {
    if (!cy) {
      setCy(cytoscape({ ...options, container: ref.current }));
    }
  }, [options, cy]);

  // Destroy the cytoscape instance on unmount
  useEffect(() => {
    return () => {
      if (cy) {
        cy.destroy();
      }
    };
  }, [cy]);

  return [ref, cy] as [React.MutableRefObject<never>, cytoscape.Core | undefined];
}

const Popover = ({
  isPopoverOpen,
  closePopover,
  items,
  timelineId,
  setPopoverSearchTerm,
  searchTerm,
}: {
  searchTerm: string;
  setPopoverSearchTerm(term: string): void;
  isPopoverOpen: boolean;
  closePopover: () => void;
  items: Array<{
    field: string;
    value: string;
  }>;
  timelineId: string;
}) => {
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');

  const data = React.useMemo(
    () =>
      items.filter((item) => {
        return (
          item.field.toLowerCase().includes(searchTerm) ||
          (typeof item.value === 'string'
            ? item.value.toLowerCase().includes(searchTerm.toLowerCase())
            : false)
        );
      }),
    [items, searchTerm]
  );

  return (
    <EuiPopover
      ownFocus={false}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      style={{ position: 'fixed', left: '50%', top: '50%' }}
      repositionOnScroll
      hasArrow={false}
    >
      <EuiSearchBar
        box={{
          incremental: true,
        }}
        onChange={(v) => setPopoverSearchTerm(v.queryText?.toLowerCase?.())}
      />
      <EuiBasicTable
        style={{ width: '500px', height: '300px', overflow: 'auto' }}
        items={data}
        rowHeader="firstName"
        columns={[
          {
            field: 'field',
            name: 'Field',
          },
          {
            field: 'value',
            name: 'Value',
          },
          {
            name: '',
            actions: [
              {
                name: 'Investigate',
                description: 'Investigate this value',
                type: 'icon',
                icon: 'magnifyWithPlus',
                onClick: (row) => {
                  const dataProvider: DataProvider = {
                    and: [],
                    enabled: true,
                    id: row.field,
                    name: 'test',
                    excluded: false,
                    kqlQuery: '',
                    queryMatch: {
                      field: row.field,
                      value: row.value,
                      operator: IS_OPERATOR,
                    },
                  };
                  dispatch(addProvider({ id: timelineId, providers: [dataProvider] }));
                  closePopover();
                },
              },
            ],
          },
        ]}
      />
    </EuiPopover>
  );
};

function CytoscapeComponent({ children, data, height, serviceName, style, id }: CytoscapeProps) {
  const {
    services: { data: dataService },
  } = useKibana();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverItems, setPopoverItems] = useState<
    Array<{
      field: string;
      value: string;
    }>
  >([]);
  const [popoverSearchTerm, setPopoverSearchTerm] = useState<string>('');
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]);

  const getDocument = React.useCallback(
    async (index: string, docId: string, source?: string[]) => {
      try {
        const body = { query: { terms: { _id: [docId] } }, _source: source ? source : [] };

        return (await dataService.search.search({ params: { index, body } }).toPromise())
          ?.rawResponse.hits.hits[0]._source;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('failed to get document', e);
      }
    },
    [dataService.search]
  );

  const closePopover = () => {
    setPopoverSearchTerm('');
    setPopoverItems([]);
    setIsPopoverOpen(false);
  };

  const theme = useTheme();
  const isTraceExplorerEnabled = false;

  const [ref, cy] = useCytoscape({
    ...getCytoscapeOptions(theme, isTraceExplorerEnabled),
    elements,
  });
  useCytoscapeEventHandlers({ cy, serviceName, theme });

  useEffect(() => {
    async function getElements() {
      setElements(await Promise.all(await convertToCytoscapeElements(data, getDocument)));
    }
    getElements();
  }, [data, getDocument]);
  // Add items from the elements prop to the cytoscape collection and remove
  // items that no longer are in the list, then trigger an event to notify
  // the handlers that data has changed.
  useEffect(() => {
    if (cy && elements.length > 0) {
      // We do a fit if we're going from 0 to >0 elements
      const fit = cy.elements().length === 0;

      cy.add(elements);
      // Remove any old elements that don't exist in the new set of elements.
      const elementIds = elements.map((element) => element.data.id);
      cy.elements().forEach((element) => {
        if (!elementIds.includes(element.data('id'))) {
          cy.remove(element);
        } else {
          // Doing an "add" with an element with the same id will keep the original
          // element. Set the data with the new element data.
          const newElement = elements.find((el) => el.data.id === element.id());
          element.data(newElement?.data ?? element.data());
        }
      });
      cy.elements().on('click', async function (event) {
        const node = event.target;
        if (node.id().startsWith('alert')) {
          // console.log(node.data(), 'element data');
          const doc = getFlattenedObject(node.data().document);
          const elems = Object.keys(doc).map((k) => ({ field: k, value: doc[k] }));
          setPopoverItems(elems);
          setIsPopoverOpen(true);
        }
      });

      cy.elements('node.user-node').on('click', function (event) {
        const node = event.target; // The node that was clicked
        const eventId = node.data('eventId');
        const eventData = data.find((d) => d._id === eventId);

        const aggregatedDataByUser = data.filter((d) => {
          return d.ecs.user?.name?.[0] === eventData?.ecs.user?.name?.[0];
        });

        if (aggregatedDataByUser) {
          // Create a function to generate a unique key for each item
          const createUniqueKey = (item: { field: string; value: string }) =>
            `${item.field}:${item.value}`;

          // Use reduce to accumulate items, but filter out duplicates based on the unique key
          const extraItems = aggregatedDataByUser
            .map((d) => {
              return Object.entries(getFlattenedObject(d.ecs))
                .filter(
                  ([field]) =>
                    field !== 'user.name' && field !== '' && field !== null && field !== undefined
                )
                .map(([field, value]) => ({
                  field,
                  value: String(value),
                }));
            })
            .reduce((acc, val) => {
              // Use a Set to track which items have already been added
              const seen = new Set(acc.map(createUniqueKey));

              // Filter out duplicates by checking against the 'seen' set
              const filteredVal = val.filter((item) => {
                const key = createUniqueKey(item);
                if (!seen.has(key)) {
                  seen.add(key);
                  return true;
                }
                return false;
              });

              return acc.concat(filteredVal);
            }, []);

          setPopoverItems([
            {
              field: 'user.name',
              value: eventData?.ecs?.user?.name?.[0] || '',
            },
            ...extraItems,
          ]);
          setIsPopoverOpen(true);
        }

        return false;
        // Your custom logic here
        // For example, you could display more information about the node
        // or trigger other changes in your application based on the node clicked
      });
      cy.elements('node.event-node').on('click', function (event) {
        // console.log('event-node', { event });
        const node = event.target; // The node that was clicked
        const eventId = node.data('id').split('-')[1];
        const eventData = data.find((d) => d._id === eventId);

        const aggregatedDataByEvent = data.filter((d) => {
          return d.ecs.event?.action?.[0] === eventData?.ecs.event?.action?.[0];
        });

        if (aggregatedDataByEvent) {
          // Create a function to generate a unique key for each item
          const createUniqueKey = (item: { field: string; value: string }) =>
            `${item.field}:${item.value}`;

          // Use reduce to accumulate items, but filter out duplicates based on the unique key
          const extraItems = aggregatedDataByEvent
            .map((d) => {
              return Object.entries(getFlattenedObject(d.ecs))
                .filter(
                  ([field]) =>
                    field !== 'event.action' &&
                    field !== '' &&
                    field !== null &&
                    field !== undefined
                )
                .map(([field, value]) => ({
                  field,
                  value: String(value),
                }));
            })
            .reduce((acc, val) => {
              // Use a Set to track which items have already been added
              const seen = new Set(acc.map(createUniqueKey));

              // Filter out duplicates by checking against the 'seen' set
              const filteredVal = val.filter((item) => {
                const key = createUniqueKey(item);
                if (!seen.has(key)) {
                  seen.add(key);
                  return true;
                }
                return false;
              });

              return acc.concat(filteredVal);
            }, []);

          setPopoverItems([
            {
              field: 'event.action',
              value: eventData?.ecs?.event?.action?.[0] || '',
            },
            ...extraItems,
          ]);
          setIsPopoverOpen(true);
        }
      });
      cy.trigger('custom:data', [fit]);

      setTimeout(() => {
        // Set 'Source IP as first element if present'
        const userElement = cy.$('[id^="user"]')[0];
        const sourceIpElement = cy.$('[id^="source-ip"]')[0];
        if (userElement && sourceIpElement) {
          sourceIpElement.position({
            x: userElement.position().x - 400,
            y: userElement.position().y,
          });
        }
        // position is reset somewhere else, so we need to set it again
      }, 250);
    }

    return () => {
      if (cy) {
        cy.off('click');
      }
    };
  }, [cy, data, elements]);

  // Add the height to the div style. The height is a separate prop because it
  // is required and can trigger rendering when changed.
  const divStyle = { ...style, height };

  return (
    <CytoscapeContext.Provider value={cy}>
      <div ref={ref} style={divStyle}>
        <Popover
          timelineId={id}
          isPopoverOpen={isPopoverOpen}
          closePopover={closePopover}
          items={popoverItems}
          setPopoverSearchTerm={setPopoverSearchTerm}
          searchTerm={popoverSearchTerm}
        />
        {children}
      </div>
    </CytoscapeContext.Provider>
  );
}

export const Cytoscape = memo(CytoscapeComponent, (prevProps, nextProps) => {
  const prevElementIds = prevProps.data.map((d) => d._id).sort();
  const nextElementIds = nextProps.data.map((d) => d._id).sort();

  const propsAreEqual =
    prevProps.height === nextProps.height &&
    prevProps.serviceName === nextProps.serviceName &&
    isEqual(prevProps.style, nextProps.style) &&
    isEqual(prevElementIds, nextElementIds);

  return propsAreEqual;
});

interface Event extends TimelineItem {
  occurrences: number;
  alertNodes: Array<{
    data: {
      id: string;
      label: string;
      eventId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: any;
    };
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getResourceName = (event: TimelineItem, document: any) => {
  const action = event?.ecs?.event?.action?.[0];

  switch (action) {
    case 'ModifyInstanceAttribute':
      return `Instance ID: ${document.aws.cloudtrail.flattened.request_parameters.instanceId}`;
    case 'RevokeSecurityGroupIngress':
    case 'AuthorizeSecurityGroupEgress':
    case 'RevokeSecurityGroupEgress':
      return `Group ID: ${document?.aws.cloudtrail.flattened.request_parameters.groupId}`;
    case 'CreateSecurityGroup':
      return `Group Name: ${document?.aws.cloudtrail.flattened.request_parameters.groupName}`;
  }

  return 'Resource Name';
};

export async function convertToCytoscapeElements(
  data: TimelineItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDocument: (index: string, docId: string, source?: string[]) => Promise<any>
): Promise<cytoscape.ElementDefinition[]> {
  const elements: cytoscape.ElementDefinition[] = [];

  // remove duplicated data
  const items: Event[] = [];
  for (const timelineItem of data) {
    const event: Event = {
      ...timelineItem,
      occurrences: 0,
      alertNodes: [],
    };
    const existing = items.find((n) => {
      return n?.ecs?.event?.action?.[0] === event?.ecs?.event?.action?.[0];
    });

    // assumes we're working with AWS docs only
    const document = await getDocument(event._index as string, event._id, ['aws.*']);
    const label = getResourceName(event, document);
    if (!existing) {
      event.occurrences = 1;
      event.alertNodes = [
        {
          data: {
            id: `alert-${event._id}`,
            label,
            eventId: event._id,
            document,
          },
        },
      ];
      items.push(event);
    } else {
      existing.occurrences += 1;
      existing.alertNodes.push({
        data: {
          id: `alert-${event._id}`,
          label,
          eventId: event._id,
          document,
        },
      });
    }
  }

  items.forEach((event) => {
    let userNodeId = '';
    const userName = event.ecs.user?.name?.[0];
    if (event.ecs.user?.name) {
      const userNode = {
        data: {
          id: `user-${userName}`,
          label: `User: ${userName}`,
          eventId: event._id,
        },
        classes: 'user-node',
      };
      elements.push(userNode);

      const eventName = event.ecs.event?.action?.[0];
      const eventNodeWrapper = {
        data: {
          id: `event-${eventName}`,
          eventId: event._id,
        },
        classes: 'event-node-border',
      };
      const eventNode = {
        data: {
          id: `event-${event._id}-inner`,
          parent: `event-${eventName}`,
          label: `${eventName} x ${event.occurrences}`,
          eventId: event._id,
        },
        classes: 'event-node',
      };
      elements.push(eventNodeWrapper);
      elements.push(eventNode);

      // Edge from user to alert
      elements.push({
        data: {
          source: userNode.data.id,
          target: eventNode.data.id,
          label: '',
        },
      });

      event.alertNodes.forEach((alertNode) => {
        elements.push(alertNode);
        elements.push({
          data: {
            source: eventNode.data.id,
            target: alertNode.data.id,
          },
        });
      });

      userNodeId = userNode.data.id;
    }

    if (event.ecs.source?.ip) {
      const sourceIpNode = {
        data: {
          id: `source-ip-${event.ecs.source.ip[0]}`,
          label: `Source IP: ${event.ecs.source.ip[0]}`,
        },
      };
      elements.push(sourceIpNode);

      const targetId = userNodeId;
      // Edge from alert to source IP
      elements.push({
        data: {
          source: sourceIpNode.data.id,
          target: targetId,
          label: 'Authenticated as',
        },
      });
    }
  });

  return elements;
}
