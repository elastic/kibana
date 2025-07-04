/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { getLifecycleMethods } from './lifecycle_methods';

interface RunTestsOpts {
  testName: string;
  archiveRoot: string;
  getService: FtrProviderContext['getService'];
}

/**
 * abstracts the duplication of tests running once for metricbeat data and once
 * for package data. Expects that the provided <archiveRoot> path defines two
 * subdirectories (metricbeat and package) containing their respective archived
 * data. The runner takes care of loading and unloading the test data.
 */
export function getTestRunner(opts: RunTestsOpts) {
  const archives = [
    { path: `${opts.archiveRoot}/metricbeat`, variant: 'Metricbeat (.monitoring-*)' },
    { path: `${opts.archiveRoot}/package`, variant: 'Package (metrics-*)' },
  ];
  const { setup, tearDown } = getLifecycleMethods(opts.getService);

  return function executeTest(assert: () => void) {
    describe(opts.testName, function () {
      archives.forEach(({ path, variant }) => {
        describe(variant, function () {
          before('load archive', () => setup(path));
          after('unload archive', () => tearDown());

          assert();
        });
      });
    });
  };
}
