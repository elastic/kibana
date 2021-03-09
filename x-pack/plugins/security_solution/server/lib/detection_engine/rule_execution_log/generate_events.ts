/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// NOTE: This is a temporary script for testing the idea of using Event Log
// for storing rule execution events and metrics.

// TODO: delete it.

import fs from 'fs';
import { RuleExecutionEventLevel } from './common_model';
import { StatusChangedEvent } from './write_model/status_changed_event';

const generate = () => {
  const event: StatusChangedEvent = {
    ruleId: '1234-56789-dfgdfhgfgh-122346567',
    spaceId: 'some-space',
    eventDate: new Date(),
    eventLevel: RuleExecutionEventLevel.WARNING,
    eventMessage: 'Missing read privileges on indices [your-index-1, your-index-2]',
    eventType: 'status-changed',
    eventPayload: {
      status: 'warning',
      executionGap: 10 * 60 * 1000, // 10 min in ms
      searchDurations: [1.25, 3.14], // in milliseconds
      indexingDurations: [5.45, 7.62], // in milliseconds
      lastLookBackDate: new Date().toISOString(),
    },
  };

  const ecsEvents = StatusChangedEvent.toEcsEvents(event);
  const fileContent = toDevToolsText(ecsEvents);
  writeFile('dev_tools_events.txt', fileContent);
};

const toDevToolsText = (ecsEvents: unknown[]): string => {
  const items = ecsEvents.map(e => {
    const json = JSON.stringify(e, null, 2);
    return `POST /try-ecs-event-log/_doc\n${json}\n`;
  });
  return items.join('\n');
};

const writeFile = (filename: string, content: string): void => {
  const filepath = `${__dirname}/${filename}`;
  fs.writeFileSync(filepath, content);
};

generate();
