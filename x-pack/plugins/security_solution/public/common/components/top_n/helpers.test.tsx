/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

import { TimelineId } from '../../../../common/types/timeline';
import {
  alertEvents,
  allEvents,
  defaultOptions,
  getOptions,
  getSourcererScopeName,
  isDetectionsAlertsTable,
  rawEvents,
  removeIgnoredAlertFilters,
  shouldIgnoreAlertFilters,
} from './helpers';
import { SourcererScopeName } from '../../store/sourcerer/model';

/** the following `TimelineId`s are detection alert tables */
const detectionAlertsTimelines = [TimelineId.detectionsPage, TimelineId.detectionsRulesDetailsPage];

/** the following `TimelineId`s are NOT detection alert tables */
const otherTimelines = [
  TimelineId.hostsPageEvents,
  TimelineId.hostsPageExternalAlerts,
  TimelineId.networkPageExternalAlerts,
  TimelineId.active,
  TimelineId.casePage,
  TimelineId.test,
  TimelineId.alternateTest,
];

const othersWithoutActive = otherTimelines.filter((x) => x !== TimelineId.active);

const hostNameFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'host.name',
    params: {
      query: 'Host-abcd',
    },
  },
  query: {
    match_phrase: {
      'host.name': {
        query: 'Host-abcd',
      },
    },
  },
};

const buildingBlockTypeFilter: Filter = {
  meta: {
    alias: null,
    negate: true,
    disabled: false,
    type: 'exists',
    key: 'signal.rule.building_block_type',
    value: 'exists',
  },
  query: {
    exists: {
      field: 'signal.rule.building_block_type',
    },
  },
};

const ruleIdFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.rule.rule_id',
    params: {
      query: '32a4aefa-80fb-4716-bc0f-3f7bb1f14929',
    },
  },
  query: {
    match_phrase: {
      'kibana.alert.rule.rule_id': '32a4aefa-80fb-4716-bc0f-3f7bb1f14929',
    },
  },
};

const ruleNameFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.rule.name',
    params: {
      query: 'baz',
    },
  },
  query: {
    match_phrase: {
      'kibana.alert.rule.name': {
        query: 'baz',
      },
    },
  },
};

const threatMappingFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    negate: false,
    key: 'kibana.alert.rule.type',
    type: 'term',
  },
  query: { term: { 'kibana.alert.rule.type': 'threat_match' } },
};

const workflowStatusFilter: Filter = {
  meta: {
    alias: null,
    negate: false,
    disabled: false,
    type: 'phrase',
    key: 'kibana.alert.workflow_status',
    params: {
      query: 'open',
    },
  },
  query: {
    term: {
      'kibana.alert.workflow_status': 'open',
    },
  },
};

const allFilters = [
  hostNameFilter,
  buildingBlockTypeFilter,
  ruleIdFilter,
  ruleNameFilter,
  threatMappingFilter,
  workflowStatusFilter,
];

describe('getOptions', () => {
  test(`it returns the default options when 'activeTimelineEventType' is undefined`, () => {
    expect(getOptions()).toEqual(defaultOptions);
  });

  test(`it returns 'allEvents' when 'activeTimelineEventType' is 'all'`, () => {
    expect(getOptions('all')).toEqual(allEvents);
  });

  test(`it returns 'rawEvents' when 'activeTimelineEventType' is 'raw'`, () => {
    expect(getOptions('raw')).toEqual(rawEvents);
  });

  test(`it returns 'alertEvents' when 'activeTimelineEventType' is 'alert'`, () => {
    expect(getOptions('alert')).toEqual(alertEvents);
  });
});

describe('isDetectionsAlertsTable', () => {
  detectionAlertsTimelines.forEach((timelineId) =>
    test(`it returns true for detections alerts table '${timelineId}'`, () => {
      expect(isDetectionsAlertsTable(timelineId)).toEqual(true);
    })
  );

  otherTimelines.forEach((timelineId) =>
    test(`it returns false for (NON alert table) timeline '${timelineId}'`, () => {
      expect(isDetectionsAlertsTable(timelineId)).toEqual(false);
    })
  );
});

describe('shouldIgnoreAlertFilters', () => {
  detectionAlertsTimelines.forEach((timelineId) => {
    test(`it returns true when the view is 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'raw';
      expect(shouldIgnoreAlertFilters({ timelineId, view })).toEqual(true);
    });

    test(`it returns false when the view is NOT 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'alert'; // the default selection for detection alert tables
      expect(shouldIgnoreAlertFilters({ timelineId, view })).toEqual(false);
    });
  });

  otherTimelines.forEach((timelineId) => {
    test(`it returns false when the view is 'raw' for (NON alert table) timeline'${timelineId}'`, () => {
      const view = 'raw';
      expect(shouldIgnoreAlertFilters({ timelineId, view })).toEqual(false);
    });

    test(`it returns false when the view is NOT 'raw' for (NON alert table) timeline '${timelineId}'`, () => {
      const view = 'alert';
      expect(shouldIgnoreAlertFilters({ timelineId, view })).toEqual(false);
    });
  });
});

describe('removeIgnoredAlertFilters', () => {
  detectionAlertsTimelines.forEach((timelineId) => {
    test(`it removes the ignored alert filters when the view is 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'raw';
      expect(removeIgnoredAlertFilters({ filters: allFilters, timelineId, view })).toEqual([
        hostNameFilter,
      ]);
    });

    test(`it does NOT remove any filters when the view is NOT 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, timelineId, view })).toEqual(
        allFilters
      );
    });
  });

  otherTimelines.forEach((timelineId) => {
    test(`it does NOT remove any filters when the view is 'raw' for (NON alert table) '${timelineId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, timelineId, view })).toEqual(
        allFilters
      );
    });

    test(`it does NOT remove any filters when the view is NOT 'raw' for (NON alert table '${timelineId}'`, () => {
      const view = 'alert';
      expect(removeIgnoredAlertFilters({ filters: allFilters, timelineId, view })).toEqual(
        allFilters
      );
    });
  });
});

describe('getSourcererScopeName', () => {
  detectionAlertsTimelines.forEach((timelineId) => {
    test(`it returns the 'default' SourcererScopeName when the view is 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'raw';
      expect(getSourcererScopeName({ timelineId, view })).toEqual(SourcererScopeName.default);
    });

    test(`it returns the 'detections' SourcererScopeName when the view is NOT 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'alert';
      expect(getSourcererScopeName({ timelineId, view })).toEqual(SourcererScopeName.detections);
    });
  });

  test(`it returns the 'default' SourcererScopeName when timelineId is undefined'`, () => {
    const timelineId = undefined;
    const view = 'raw';
    expect(getSourcererScopeName({ timelineId, view })).toEqual(SourcererScopeName.default);
  });

  test(`it returns the 'timeline' SourcererScopeName when the view is 'raw' for the active timeline '${TimelineId.active}'`, () => {
    const view = 'raw';
    expect(getSourcererScopeName({ timelineId: TimelineId.active, view })).toEqual(
      SourcererScopeName.timeline
    );
  });

  test(`it returns the 'timeline' SourcererScopeName when the view is NOT 'raw' for the active timeline '${TimelineId.active}'`, () => {
    const view = 'all';
    expect(getSourcererScopeName({ timelineId: TimelineId.active, view })).toEqual(
      SourcererScopeName.timeline
    );
  });

  othersWithoutActive.forEach((timelineId) => {
    test(`it returns the 'default' SourcererScopeName when the view is 'raw' for (NON alert table) timeline '${timelineId}'`, () => {
      const view = 'raw';
      expect(getSourcererScopeName({ timelineId, view })).toEqual(SourcererScopeName.default);
    });

    test(`it returns the 'default' SourcererScopeName when the view is NOT 'raw' for detections alerts table '${timelineId}'`, () => {
      const view = 'alert';
      expect(getSourcererScopeName({ timelineId, view })).toEqual(SourcererScopeName.default);
    });
  });
});
