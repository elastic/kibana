/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reporting } from './index';
import { getConfigSchema } from '../../test_utils';

describe('default config', () => {
  describe('dev = false, dist = false', () => {
    it('produces correct config', async () => {
      const schema = await getConfigSchema(reporting);
      await expect(
        schema.validate(
          {},
          {
            context: {
              dev: false,
              dist: false,
            },
          }
        )
      ).resolves.toMatchInlineSnapshot(`
Object {
  "capture": Object {
    "browser": Object {
      "autoDownload": true,
      "chromium": Object {
        "disableSandbox": false,
        "maxScreenshotDimension": 1950,
        "proxy": Object {
          "enabled": false,
        },
      },
      "type": "chromium",
    },
    "concurrency": 4,
    "loadDelay": 3000,
    "settleTime": 1000,
    "timeout": 20000,
    "viewport": Object {
      "height": 1200,
      "width": 1950,
    },
    "zoom": 2,
  },
  "csv": Object {
    "maxSizeBytes": 10485760,
    "scroll": Object {
      "duration": "30s",
      "size": 500,
    },
  },
  "enabled": true,
  "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "index": ".reporting",
  "kibanaServer": Object {},
  "poll": Object {
    "jobCompletionNotifier": Object {
      "interval": 10000,
      "intervalErrorMultiplier": 5,
    },
    "jobsRefresh": Object {
      "interval": 5000,
      "intervalErrorMultiplier": 5,
    },
  },
  "queue": Object {
    "indexInterval": "week",
    "pollEnabled": true,
    "pollInterval": 3000,
    "pollIntervalErrorMultiplier": 10,
    "timeout": 120000,
  },
  "roles": Object {
    "allow": Array [
      "reporting_user",
    ],
  },
}
`);
    });
  });

  describe('dev = false, dist = true', () => {
    it('produces correct config', async () => {
      const schema = await getConfigSchema(reporting);
      await expect(
        schema.validate(
          {},
          {
            context: {
              dev: false,
              dist: true,
            },
          }
        )
      ).resolves.toMatchInlineSnapshot(`
Object {
  "capture": Object {
    "browser": Object {
      "autoDownload": false,
      "chromium": Object {
        "disableSandbox": false,
        "maxScreenshotDimension": 1950,
        "proxy": Object {
          "enabled": false,
        },
      },
      "type": "chromium",
    },
    "concurrency": 4,
    "loadDelay": 3000,
    "settleTime": 1000,
    "timeout": 20000,
    "viewport": Object {
      "height": 1200,
      "width": 1950,
    },
    "zoom": 2,
  },
  "csv": Object {
    "maxSizeBytes": 10485760,
    "scroll": Object {
      "duration": "30s",
      "size": 500,
    },
  },
  "enabled": true,
  "index": ".reporting",
  "kibanaServer": Object {},
  "poll": Object {
    "jobCompletionNotifier": Object {
      "interval": 10000,
      "intervalErrorMultiplier": 5,
    },
    "jobsRefresh": Object {
      "interval": 5000,
      "intervalErrorMultiplier": 5,
    },
  },
  "queue": Object {
    "indexInterval": "week",
    "pollEnabled": true,
    "pollInterval": 3000,
    "pollIntervalErrorMultiplier": 10,
    "timeout": 120000,
  },
  "roles": Object {
    "allow": Array [
      "reporting_user",
    ],
  },
}
`);
    });
  });

  describe('dev = true, dist = false', () => {
    it('produces correct config', async () => {
      const schema = await getConfigSchema(reporting);
      await expect(
        schema.validate(
          {},
          {
            context: {
              dev: true,
              dist: false,
            },
          }
        )
      ).resolves.toMatchInlineSnapshot(`
Object {
  "capture": Object {
    "browser": Object {
      "autoDownload": true,
      "chromium": Object {
        "disableSandbox": false,
        "maxScreenshotDimension": 1950,
        "proxy": Object {
          "enabled": false,
        },
      },
      "type": "chromium",
    },
    "concurrency": 4,
    "loadDelay": 3000,
    "settleTime": 1000,
    "timeout": 20000,
    "viewport": Object {
      "height": 1200,
      "width": 1950,
    },
    "zoom": 2,
  },
  "csv": Object {
    "maxSizeBytes": 10485760,
    "scroll": Object {
      "duration": "30s",
      "size": 500,
    },
  },
  "enabled": true,
  "encryptionKey": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "index": ".reporting",
  "kibanaServer": Object {},
  "poll": Object {
    "jobCompletionNotifier": Object {
      "interval": 10000,
      "intervalErrorMultiplier": 5,
    },
    "jobsRefresh": Object {
      "interval": 5000,
      "intervalErrorMultiplier": 5,
    },
  },
  "queue": Object {
    "indexInterval": "week",
    "pollEnabled": true,
    "pollInterval": 3000,
    "pollIntervalErrorMultiplier": 10,
    "timeout": 120000,
  },
  "roles": Object {
    "allow": Array [
      "reporting_user",
    ],
  },
}
`);
    });
  });

  describe('dev = true, dist = true', () => {
    it('produces correct config', async () => {
      const schema = await getConfigSchema(reporting);
      await expect(
        schema.validate(
          {},
          {
            context: {
              dev: true,
              dist: true,
            },
          }
        )
      ).resolves.toMatchInlineSnapshot(`
Object {
  "capture": Object {
    "browser": Object {
      "autoDownload": false,
      "chromium": Object {
        "disableSandbox": false,
        "maxScreenshotDimension": 1950,
        "proxy": Object {
          "enabled": false,
        },
      },
      "type": "chromium",
    },
    "concurrency": 4,
    "loadDelay": 3000,
    "settleTime": 1000,
    "timeout": 20000,
    "viewport": Object {
      "height": 1200,
      "width": 1950,
    },
    "zoom": 2,
  },
  "csv": Object {
    "maxSizeBytes": 10485760,
    "scroll": Object {
      "duration": "30s",
      "size": 500,
    },
  },
  "enabled": true,
  "index": ".reporting",
  "kibanaServer": Object {},
  "poll": Object {
    "jobCompletionNotifier": Object {
      "interval": 10000,
      "intervalErrorMultiplier": 5,
    },
    "jobsRefresh": Object {
      "interval": 5000,
      "intervalErrorMultiplier": 5,
    },
  },
  "queue": Object {
    "indexInterval": "week",
    "pollEnabled": true,
    "pollInterval": 3000,
    "pollIntervalErrorMultiplier": 10,
    "timeout": 120000,
  },
  "roles": Object {
    "allow": Array [
      "reporting_user",
    ],
  },
}
`);
    });
  });
});
