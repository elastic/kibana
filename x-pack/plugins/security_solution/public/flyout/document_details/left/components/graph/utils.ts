/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetFieldsData } from '../../../../../common/hooks/use_get_fields_data';
import type { HighlightedFieldsTableRow } from '../../../right/components/highlighted_fields';
import { getField } from '../../../shared/utils';

const getType = (value: string) => {
  switch (value) {
    case 'user.name':
      return 'user';
    case 'host.name':
      return 'host';
    case 'file.path':
      return 'file';
  }
  return undefined;
};

export const getNodes = (
  items: HighlightedFieldsTableRow[],
  alerts: Array<Record<string, unknown>>,
  getFieldsData: GetFieldsData,
  eventId: string,
  indexName: string,
  scopeId: string
): cytoscape.ElementDefinition[] => {
  const nodes: cytoscape.ElementDefinition[] = [];

  const event = getField(getFieldsData('event.category')) ?? 'event';
  nodes.push({
    data: { id: event, type: 'event', weight: 9, label: event },
    position: { x: 300, y: 300 },
    classes: 'event-node',
  });

  const isAlert = getField(getFieldsData('event.kind')) === 'signal';
  const severity = getField(getFieldsData('kibana.alert.severity'));
  if (isAlert) {
    nodes.push({
      data: {
        id: 'Alert',
        type: 'alert',
        severity,
        label: 'Alert',
        eventId,
        indexName,
        scopeId,
        ruleId: getField(getFieldsData('kibana.alert.rule.uuid')),
        weight: 5,
      },
      classes: 'alert-node',
    });
    nodes.push({
      data: { id: 'generated alert', source: event, target: 'Alert', label: 'generated alert' },
    });
    // console.log('generated alert', eventId);
    const alertId = getField(getFieldsData('kibana.alert.uuid'));
    alerts.forEach((alert) => {
      let i = 0;
      // console.log(alert['kibana.alert.rule.severity']);
      if (alert['kibana.alert.uuid'] !== alertId) {
        nodes.push({
          data: {
            id: `related-alert-node-${i}`,
            type: 'alert',
            severity: alert['kibana.alert.severity'],
            label: 'Alert',
            eventId: alert['kibana.alert.uuid'],
            indexName,
            scopeId,
            ruleId: alert['kibana.alert.rule.uuid'],
            weight: 5,
          },
          classes: 'alert-node',
        });
        nodes.push({
          data: {
            id: `related-alert-edge-${i}`,
            source: event,
            target: `related-alert-node-${i}`,
            label: 'related alert',
            type: 'related',
          },
        });
        i = i + 1;
      }
    });
  }

  items.forEach((item) => {
    const field = item.field;
    const value = getField(item.description.values);
    if (value != null && field !== 'agent.status') {
      nodes.push({
        data: { id: value, type: getType(field), label: value, weight: 5 },
        classes: getType(field) && `${getType(field)}-node`,
      });
      // if (field === 'user.name') {
      //   const domain = getField(getFieldsData('user.domain'));
      //   if (domain) {
      //     nodes.push({
      //       data: { id: domain, label: domain, weight: 1 },
      //     });
      //     nodes.push({
      //       data: { id: 'user.domain', source: value, target: domain, label: 'user.domain' },
      //     });
      //   }
      // }
      // if (field === 'host.name') {
      //   const os = getField(getFieldsData('host.os.family'));
      //   if (os) {
      //     nodes.push({
      //       data: { id: os, label: os, weight: 1 },
      //     });
      //     nodes.push({
      //       data: { id: 'host.os.family', source: value, target: os, label: 'host.os.family' },
      //     });
      //   }
      //   const ipArray = getFieldArray(getFieldsData('host.ip'));
      //   if (ipArray.length > 0) {
      //     let j = 0;
      //     ipArray.forEach((ip) => {
      //       nodes.push({
      //         data: { id: ip, label: ip, weight: 1 },
      //       });
      //       nodes.push({
      //         data: { id: `host.ip-${j}`, source: value, target: ip, label: 'host.ip' },
      //       });
      //       j = j + 1;
      //     });
      //   }
      // }

      nodes.push({ data: { id: field, source: event, target: value, label: field } });
    }
  });
  return nodes;
};
