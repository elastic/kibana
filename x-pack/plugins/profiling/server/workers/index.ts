/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import Path from 'path';
import type {
  ParseStacktracesOptions,
  ParseStacktracesReturn,
} from '../../common/parse_stacktraces';
import type { CalleeTree, CreateCalleeTreeOptions } from '../../common/callee';

const piscina = new Piscina({
  filename: Path.resolve(__dirname, '../../scripts/worker.js'),
});

const workers = {
  parseStacktraces: (options: ParseStacktracesOptions): Promise<ParseStacktracesReturn> => {
    return piscina.run(options, { name: 'parseStacktraces' });
  },
  createCalleeTree: (options: CreateCalleeTreeOptions): Promise<CalleeTree> => {
    return piscina.run(options, { name: 'createCalleeTree' });
  },
};

export { workers };
