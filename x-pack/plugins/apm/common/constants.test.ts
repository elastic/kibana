/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { APMError } from '../typings/es_schemas/Error';
import { Span } from '../typings/es_schemas/Span';
import { Transaction } from '../typings/es_schemas/Transaction';
import * as constants from './constants';

describe('Transaction v1:', () => {
  const transaction: Transaction = {
    version: 'v1',
    '@timestamp': new Date().toString(),
    beat: {
      hostname: 'beat hostname',
      name: 'beat name',
      version: 'beat version'
    },
    host: {
      name: 'my hostname'
    },
    processor: {
      name: 'transaction',
      event: 'transaction'
    },
    context: {
      system: {
        architecture: 'x86',
        hostname: 'some-host',
        ip: '111.0.2.3',
        platform: 'linux'
      },
      service: {
        name: 'service name',
        agent: {
          name: 'agent name',
          version: 'v1337'
        },
        language: {
          name: 'nodejs',
          version: 'v1337'
        }
      },
      user: {
        id: '1337'
      },
      request: {
        url: {
          full: 'http://www.elastic.co'
        },
        method: 'GET'
      }
    },
    transaction: {
      duration: {
        us: 1337
      },
      id: 'transaction id',
      name: 'transaction name',
      result: 'transaction result',
      sampled: true,
      type: 'transaction type'
    }
  };

  matchSnapshot(transaction);
});

describe('Transaction v2', () => {
  const transaction: Transaction = {
    version: 'v2',
    '@timestamp': new Date().toString(),
    beat: {
      hostname: 'beat hostname',
      name: 'beat name',
      version: 'beat version'
    },
    host: { name: 'my hostname' },
    processor: { name: 'transaction', event: 'transaction' },
    timestamp: { us: 1337 },
    trace: { id: 'trace id' },
    context: {
      system: {
        architecture: 'x86',
        hostname: 'some-host',
        ip: '111.0.2.3',
        platform: 'linux'
      },
      service: {
        name: 'service name',
        agent: { name: 'agent name', version: 'v1337' },
        language: { name: 'nodejs', version: 'v1337' }
      },
      user: { id: '1337' },
      request: { url: { full: 'http://www.elastic.co' }, method: 'GET' }
    },
    parent: {
      id: 'parentId'
    },
    transaction: {
      duration: { us: 1337 },
      id: 'transaction id',
      name: 'transaction name',
      result: 'transaction result',
      sampled: true,
      type: 'transaction type'
    },
    kubernetes: {
      pod: {
        uid: 'pod1234567890abcdef'
      }
    },
    container: {
      id: 'container1234567890abcdef'
    }
  };

  matchSnapshot(transaction);
});

describe('Span v1', () => {
  const span: Span = {
    version: 'v1',
    '@timestamp': new Date().toString(),
    beat: {
      hostname: 'beat hostname',
      name: 'beat name',
      version: 'beat version'
    },
    host: {
      name: 'my hostname'
    },
    processor: {
      name: 'transaction',
      event: 'span'
    },
    context: {
      db: {
        statement: 'db statement'
      },
      service: {
        name: 'service name',
        agent: {
          name: 'agent name',
          version: 'v1337'
        },
        language: {
          name: 'nodejs',
          version: 'v1337'
        }
      }
    },
    span: {
      duration: {
        us: 1337
      },
      start: {
        us: 1337
      },
      name: 'span name',
      type: 'span type',
      id: 1337
    },
    transaction: {
      id: 'transaction id'
    }
  };

  matchSnapshot(span);
});

describe('Span v2', () => {
  const span: Span = {
    version: 'v2',
    '@timestamp': new Date().toString(),
    beat: {
      hostname: 'beat hostname',
      name: 'beat name',
      version: 'beat version'
    },
    host: {
      name: 'my hostname'
    },
    processor: {
      name: 'transaction',
      event: 'span'
    },
    timestamp: {
      us: 1337
    },
    trace: {
      id: 'trace id'
    },
    context: {
      db: {
        statement: 'db statement'
      },
      service: {
        name: 'service name',
        agent: {
          name: 'agent name',
          version: 'v1337'
        },
        language: {
          name: 'nodejs',
          version: 'v1337'
        }
      }
    },
    parent: {
      id: 'parentId'
    },
    span: {
      duration: {
        us: 1337
      },
      name: 'span name',
      type: 'span type',
      id: 1337,
      hex_id: 'hex id'
    },
    transaction: {
      id: 'transaction id'
    }
  };

  matchSnapshot(span);
});

describe('Error v2', () => {
  const errorDoc: APMError = {
    agent: {
      hostname: 'agent hostname',
      type: 'apm-server',
      version: '7.0.0'
    },
    error: {
      exception: {
        module: 'errors',
        handled: false,
        message: 'sonic boom',
        type: 'errorString'
      },
      culprit: 'handleOopsie',
      id: 'error id',
      grouping_key: 'grouping key'
    },
    version: 'v2',
    '@timestamp': new Date().toString(),
    beat: {
      hostname: 'beat hostname',
      name: 'beat name',
      version: 'beat version'
    },
    host: {
      name: 'my hostname'
    },
    processor: {
      name: 'error',
      event: 'error'
    },
    timestamp: {
      us: 1337
    },
    trace: {
      id: 'trace id'
    },
    context: {
      service: {
        name: 'service name',
        agent: {
          name: 'agent name',
          version: 'v1337'
        },
        language: {
          name: 'nodejs',
          version: 'v1337'
        }
      }
    },
    parent: {
      id: 'parentId'
    },
    transaction: {
      id: 'transaction id'
    }
  };

  matchSnapshot(errorDoc);
});

function matchSnapshot(obj: Span | Transaction | APMError) {
  Object.entries(constants).forEach(([key, longKey]) => {
    const value = get(obj, longKey);
    it(key, () => {
      expect(value).toMatchSnapshot();
    });
  });
}
