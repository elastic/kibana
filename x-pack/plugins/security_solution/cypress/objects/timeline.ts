/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TimelineResult } from '../../server/graphql/types';

export interface Timeline {
  title: string;
  description: string;
  query: string;
  id?: string;
}

export interface CompleteTimeline extends Timeline {
  notes: string;
  filter: TimelineFilter;
}

export interface TimelineFilter {
  field: string;
  operator: string;
  value?: string;
}

export const filter: TimelineFilter = {
  field: 'host.name',
  operator: 'exists',
};

export const timeline: CompleteTimeline = {
  title: 'Security Timeline',
  description: 'This is the best timeline',
  query: 'host.name: *',
  notes: 'Yes, the best timeline',
  filter,
};

export const caseTimeline: Timeline = {
  title: 'SIEM test',
  description: 'description',
  query: 'host.name: *',
  id: '0162c130-78be-11ea-9718-118a926974a4',
};

export const expectedExportedTimelineTemplate = (template: TimelineResult) => {
  const jsontemplate = template;

  return `{"savedObjectId":"${jsontemplate.savedObjectId}","version":"${jsontemplate.version}","columns":[{"id":"@timestamp"},{"id":"user.name"},{"id":"event.category"},{"id":"event.action"},{"id":"host.name"}],"kqlMode":"filter","kqlQuery":{"filterQuery":{"kuery":{"expression":"${jsontemplate.kqlQuery.filterQuery.kuery.expression}","kind":"kuery"}}},"dateRange":{"start":"${jsontemplate.dateRange.start}","end":"${jsontemplate.dateRange.end}"},"description":"${jsontemplate.description}","title":"${jsontemplate.title}","templateTimelineVersion":1,"timelineType":"template","created":${jsontemplate.created},"createdBy":"elastic","updated":${jsontemplate.updated},"updatedBy":"elastic","eventNotes":[],"globalNotes":[],"pinnedEventIds":[]}
`;
};

export const expectedExportedTimeline = (timelineBody: string) => {
  const jsontimeline = JSON.parse(timelineBody);

  return `{"savedObjectId":"${jsontimeline.savedObjectId}","version":"${jsontimeline.version}","columns":[{"id":"@timestamp"},{"id":"user.name"},{"id":"event.category"},{"id":"event.action"},{"id":"host.name"}],"kqlMode":"filter","kqlQuery":{"filterQuery":{"kuery":{"expression":"${jsontimeline.kqlQuery.filterQuery.kuery.expression}","kind":"kuery"}}},"dateRange":{"start":"${jsontimeline.dateRange.start}","end":"${jsontimeline.dateRange.end}"},"description":"${jsontimeline.description}","title":"${jsontimeline.title}","created":${jsontimeline.created},"createdBy":"elastic","updated":${jsontimeline.updated},"updatedBy":"elastic","timelineType":"default","eventNotes":[],"globalNotes":[],"pinnedEventIds":[]}\n`;
};
