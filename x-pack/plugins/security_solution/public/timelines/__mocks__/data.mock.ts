/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See: https://github.com/elastic/kibana/issues/117255, this creates mocks to avoid memory leaks from kibana core.

// We _must_ import from the restricted path or we pull in _everything_ including memory leaks from Kibana core
// import { pagePathGetters } from '../../../fleet/public/constants/page_paths';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FilterManager } from '../../../../../../src/plugins/data/public/query/filter_manager/filter_manager';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createSavedQueryService } from '../../../../../../src/plugins/data/public/query/saved_query/saved_query_service';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TimeHistory } from '../../../../../../src/plugins/data/public/query/timefilter/time_history';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SearchBar } from '../../../../../../src/plugins/data/public/ui/search_bar';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { isEsError } from '../../../../../../src/plugins/data/public/search/errors/types';

// console.log('--> HERE in public data mock');
// eslint-disable-next-line import/no-commonjs
module.exports = {
  FilterManager,
  TimeHistory,
  SearchBar,
  isEsError,
  createSavedQueryService,
  indexPatterns: {
    ILLEGAL_CHARACTERS_VISIBLE: [],
  },
};
