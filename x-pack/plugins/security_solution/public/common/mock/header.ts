/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ColumnHeaderOptions } from '../../timelines/store/timeline/model';
import { defaultColumnHeaderType } from '../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../timelines/components/timeline/body/constants';

export const defaultHeaders: ColumnHeaderOptions[] = [
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Date/time when the event originated.\nFor log events this is the date/time when the event was generated, and not when it was read.\nRequired field for all events.',
    example: '2016-05-23T08:05:34.853Z',
    id: '@timestamp',
    type: 'date',
    aggregatable: true,
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
  {
    category: 'event',
    columnHeaderType: defaultColumnHeaderType,
    description:
      "Severity describes the severity of the event. What the different severity values mean can very different between use cases. It's up to the implementer to make sure severities are consistent across events.",
    example: '7',
    id: 'event.severity',
    type: 'long',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'event',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Event category.\nThis contains high-level information about the contents of the event. It is more generic than `event.action`, in the sense that typically a category contains multiple actions. Warning: In future versions of ECS, we plan to provide a list of acceptable values for this field, please use with caution.',
    example: 'user-management',
    id: 'event.category',
    type: 'keyword',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'event',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'The action captured by the event.\nThis describes the information in the event. It is more specific than `event.category`. Examples are `group-add`, `process-started`, `file-created`. The value is normally defined by the implementer.',
    example: 'user-password-change',
    id: 'event.action',
    type: 'keyword',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'host',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
    example: '',
    id: 'host.name',
    type: 'keyword',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'source',
    columnHeaderType: defaultColumnHeaderType,
    description: 'IP address of the source.\nCan be one or multiple IPv4 or IPv6 addresses.',
    example: '',
    id: 'source.ip',
    type: 'ip',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'destination',
    columnHeaderType: defaultColumnHeaderType,
    description: 'IP address of the destination.\nCan be one or multiple IPv4 or IPv6 addresses.',
    example: '',
    id: 'destination.ip',
    type: 'ip',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    aggregatable: true,
    category: 'destination',
    columnHeaderType: defaultColumnHeaderType,
    description: 'Bytes sent from the source to the destination',
    example: '123',
    format: 'bytes',
    id: 'destination.bytes',
    type: 'number',
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'user',
    columnHeaderType: defaultColumnHeaderType,
    description: 'Short name or login of the user.',
    example: 'albert',
    id: 'user.name',
    type: 'keyword',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description: 'Each document has an _id that uniquely identifies it',
    example: 'Y-6TfmcB0WOhS6qyMv3s',
    id: '_id',
    type: 'keyword',
    aggregatable: true,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    category: 'base',
    columnHeaderType: defaultColumnHeaderType,
    description:
      'For log events the message field contains the log message.\nIn other use cases the message field can be used to concatenate different values which are then freely searchable. If multiple messages exist, they can be combined into one message.',
    example: 'Hello World',
    id: 'message',
    type: 'text',
    aggregatable: false,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
];
