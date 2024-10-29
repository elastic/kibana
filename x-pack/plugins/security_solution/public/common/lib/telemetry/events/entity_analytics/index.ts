/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const entityClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityDetailsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const entityAlertsClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityAlertsClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const entityRiskFilteredEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.EntityRiskFiltered,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: true,
      },
    },
    selectedSeverity: {
      type: 'keyword',
      _meta: {
        description: 'Selected severity (Unknown|Low|Moderate|High|Critical)',
        optional: false,
      },
    },
  },
};

export const toggleRiskSummaryClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.ToggleRiskSummaryClicked,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
    action: {
      type: 'keyword',
      _meta: {
        description: 'It defines if the section is opening or closing (show|hide)',
        optional: false,
      },
    },
  },
};

export const RiskInputsExpandedFlyoutOpenedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.RiskInputsExpandedFlyoutOpened,
  schema: {
    entity: {
      type: 'keyword',
      _meta: {
        description: 'Entity name (host|user)',
        optional: false,
      },
    },
  },
};

export const addRiskInputToTimelineClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AddRiskInputToTimelineClicked,
  schema: {
    quantity: {
      type: 'integer',
      _meta: {
        description: 'Quantity of alerts added to timeline',
        optional: false,
      },
    },
  },
};

export const assetCriticalityFileSelectedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssetCriticalityFileSelected,
  schema: {
    valid: {
      type: 'boolean',
      _meta: {
        description: 'If the file is valid',
        optional: false,
      },
    },
    errorCode: {
      type: 'keyword',
      _meta: {
        description: 'Error code if the file is invalid',
        optional: true,
      },
    },
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
  },
};

export const assetCriticalityCsvPreviewGeneratedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssetCriticalityCsvPreviewGenerated,
  schema: {
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
    processing: {
      properties: {
        startTime: {
          type: 'date',
          _meta: {
            description: 'Processing start time',
            optional: false,
          },
        },
        endTime: {
          type: 'date',
          _meta: {
            description: 'Processing end time',
            optional: false,
          },
        },
        tookMs: {
          type: 'long',
          _meta: {
            description: 'Processing time in milliseconds',
            optional: false,
          },
        },
      },
    },
    stats: {
      properties: {
        validLines: {
          type: 'long',
          _meta: {
            description: 'Number of valid lines',
            optional: false,
          },
        },
        invalidLines: {
          type: 'long',
          _meta: {
            description: 'Number of invalid lines',
            optional: false,
          },
        },
        totalLines: {
          type: 'long',
          _meta: {
            description: 'Total number of lines',
            optional: false,
          },
        },
      },
    },
  },
};

export const assetCriticalityCsvImportedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AssetCriticalityCsvImported,
  schema: {
    file: {
      properties: {
        size: {
          type: 'long',
          _meta: {
            description: 'File size in bytes',
            optional: false,
          },
        },
      },
    },
  },
};
