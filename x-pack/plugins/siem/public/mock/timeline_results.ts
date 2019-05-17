/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineResult } from '../components/open_timeline/types';

/** Mocks results of a query run by the `OpenTimeline` component */
export const mockTimelineResults: TimelineResult[] = [
  {
    created: 1553700736 * 1000,
    description: '6 pinned events, 4 notes (event1 [2] + event2 [1] + global [1]), is a favorite',
    eventIdToNoteIds: {
      event1: ['noteId1', 'noteId2'],
      event2: ['noteId3'],
    },
    favorite: [
      {
        userName: 'alice',
        favoriteDate: 1553700737 * 10000,
      },
    ],
    noteIds: ['noteId4'],
    notes: [
      {
        note:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Magna ac placerat vestibulum lectus. Morbi tincidunt ornare massa eget egestas purus. Quis varius quam quisque id diam. Nulla pellentesque dignissim enim sit amet.',
        savedObjectId: 'noteId1',
        updated: 1553700738 * 1000,
        updatedBy: 'alice',
      },
      {
        note: 'Interdum velit euismod in pellentesque massa placerat duis.',
        savedObjectId: 'noteId2',
        updated: 1553700739 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Cras tincidunt lobortis feugiat vivamus at augue eget arcu dictum. Morbi quis commodo odio aenean sed. Sit amet aliquam id diam. Enim nec dui nunc mattis enim ut tellus elementum.',
        savedObjectId: 'noteId3',
        updated: 1553700740 * 1000,
        updatedBy: 'bob',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId4',
        updated: 1553700741 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId5',
        updated: 1553700742 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId6',
        updated: 1553700743 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId7',
        updated: 1553700744 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId8',
        updated: 1553700745 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId9',
        updated: 1553700746 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId10',
        updated: 1553700747 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId11',
        updated: 1553700748 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId12',
        updated: 1553700749 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId13',
        updated: 1553700750 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId14',
        updated: 1553700751 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId15',
        updated: 1553700752 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId16',
        updated: 1553700753 * 1000,
        updatedBy: 'alice',
      },
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId17',
        updated: 1553700753 * 1000,
        updatedBy: 'alice',
      },
    ],
    pinnedEventIds: {
      event1: true,
      event2: true,
      event3: true,
      event4: true,
      event5: true,
      event6: true,
    },
    savedObjectId: 'saved-timeline-11',
    title: 'Privilege Escalation',
    updated: 1553700753 * 1000,
    updatedBy: 'alice',
  },
  {
    created: 1551987071 * 1000,
    description: 'Null pinned events, notes, or favorites',
    savedObjectId: 'saved-timeline-10',
    title: '    Spartan    ',
    updated: 1551987071 * 1000,
    updatedBy: 'firstname.lastname',
  },
  {
    created: 1550703360 * 1000,
    eventIdToNoteIds: {},
    favorite: [],
    noteIds: [],
    notes: [],
    pinnedEventIds: {},
    savedObjectId: 'saved-timeline-9',
    title: 'No description',
    updated: 1550703360 * 1000,
    updatedBy: 'jessica',
  },
  {
    created: 1549403981 * 1000,
    description: 'this has null fields for all counted fields',
    eventIdToNoteIds: null,
    favorite: [],
    noteIds: null,
    notes: null,
    pinnedEventIds: null,
    savedObjectId: 'saved-timeline-8',
    title: 'all countable fields are null',
    updated: 1549403981 * 1000,
    updatedBy: 'nicole',
  },
  {
    created: 1546594386 * 1000,
    description: 'malformed data: no savedObjectId',
    eventIdToNoteIds: null,
    favorite: [],
    noteIds: null,
    pinnedEventIds: {
      event1: true,
      event2: true,
    },
    title: 'malformed data',
    updated: 1546594386 * 1000,
    updatedBy: 'ricky',
  },
  {
    created: 1545055450 * 1000,
    description: 'malformed data: null title',
    eventIdToNoteIds: null,
    favorite: [],
    noteIds: null,
    pinnedEventIds: null,
    savedObjectId: 'saved-timeline-6',
    updated: 1545055450 * 1000,
    updatedBy: 'marty',
  },
  {
    created: 1543604192 * 1000,
    description: 'empty title',
    eventIdToNoteIds: {
      event1: ['noteId5', 'noteId6'],
    },
    favorite: [],
    noteIds: [],
    notes: [
      {
        note: 'Nisl nunc mi ipsum faucibus vitae aliquet nec ullamcorper.',
        savedObjectId: 'noteId5',
        updated: 1543603192 * 1000,
        updatedBy: 'olivia',
      },
      {
        note:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        savedObjectId: 'noteId6',
        updated: 1543604192 * 1000,
        updatedBy: 'olivia',
      },
    ],
    pinnedEventIds: {},
    savedObjectId: 'saved-timeline-5',
    title: '',
    updated: 1543604192 * 1000,
    updatedBy: 'olivia',
  },
  {
    created: 1543604192 * 1000,
    description: 'malformed data: no updated (no last modified or last updated)',
    eventIdToNoteIds: null,
    favorite: [],
    noteIds: null,
    pinnedEventIds: null,
    savedObjectId: 'saved-timeline-4',
    title: 'missing metadata',
  },
  {
    created: 1541677311 * 1000,
    description: 'a long title with no break',
    eventIdToNoteIds: {
      event2: ['noteId7'],
    },
    favorite: [
      {
        userName: 'nicole',
        favoriteDate: 1541677314 * 1000,
      },
    ],
    noteIds: [],
    notes: [
      {
        note:
          'Lobortis elementum nibh tellus molestie nunc non blandit massa enim. Vulputate ut pharetra sit amet aliquam id diam.',
        savedObjectId: 'noteId7',
        updated: 1541677314 * 1000,
        updatedBy: 'charlotte',
      },
    ],
    pinnedEventIds: {
      event1: true,
      event2: true,
      event3: true,
      event4: true,
    },
    savedObjectId: 'saved-timeline-3',
    title: 'supercalifragilisticexpialidocious',
    updated: 1541677314 * 1000,
    updatedBy: 'charlotte',
  },
  {
    created: 1541550878 * 1000,
    description: '',
    eventIdToNoteIds: {},
    favorite: [],
    noteIds: ['noteId8'],
    notes: [
      {
        note: 'Dictum sit amet justo donec enim diam.',
        savedObjectId: 'noteId8',
        updated: 1541550878 * 1000,
        updatedBy: 'admin',
      },
    ],
    pinnedEventIds: {},
    savedObjectId: 'saved-timeline-2',
    title: '',
    updated: 1541550878 * 1000,
    updatedBy: 'admin',
  },
  {
    created: 1540936411 * 1000,
    description: '',
    favorite: [],
    pinnedEventIds: {
      event1: true,
      event2: true,
      event3: true,
      event4: true,
      event5: true,
    },
    savedObjectId: 'saved-timeline-1',
    title: 'wowzers',
    updated: 1540936411 * 1000,
    updatedBy: 'karen',
  },
];
