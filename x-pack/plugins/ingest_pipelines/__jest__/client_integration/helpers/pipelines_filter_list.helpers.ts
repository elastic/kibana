/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pipeline } from '../../../common/types';

type FilterName = 'managed' | 'notManaged';

const pipeline1 = {
  name: 'test_pipeline1',
  processors: [],
  isManaged: true,
};

const pipeline2 = {
  name: 'test_pipeline2',
  processors: [],
  isManaged: true,
};

const pipeline3 = {
  name: 'test_pipeline3',
  processors: [],
  isManaged: false,
};

const pipeline4 = {
  name: 'test_pipeline4',
  processors: [],
  isManaged: false,
};

const getSelectedPipelinesMock = jest.fn((selectedPipelines: number[]) =>
  selectedPipelines.map((index) => getPipelinesMock()[index])
);

const getPipelinesMock = jest.fn(() => [pipeline1, pipeline2, pipeline3, pipeline4]);

const isManagedPipelines = (allPipelines: Pipeline[], isManaged: boolean) =>
  allPipelines.filter((pipeline) => pipeline.isManaged === isManaged);

const getFilteredPipelinesMock = jest.fn((pipelines: Pipeline[], checkedFilters: string[]) => {
  const filters = {
    managed: {
      name: 'Managed pipelines',
      checked: checkedFilters[0],
      handleFilter: (allPipelines: Pipeline[]) => isManagedPipelines(allPipelines, true),
    },
    notManaged: {
      name: 'Not managed pipelines',
      checked: checkedFilters[1],
      handleFilter: (allPipelines: Pipeline[]) => isManagedPipelines(allPipelines, false),
    },
  };

  const selectedFilters = Object.entries(filters)
    .filter((item) => item[1].checked === 'on')
    .map(([filterName]) => filterName as FilterName);

  const filteredPipelines = (allPipelines: Pipeline[]) => {
    if (!selectedFilters) return allPipelines;

    let filteredItems: Pipeline[] = [];

    selectedFilters.forEach((filter) => {
      const filterFunction = filters[filter]?.handleFilter;
      if (filterFunction) {
        filteredItems = filteredItems.concat(filterFunction(allPipelines));
      }
    });

    return filteredItems;
  };

  return filteredPipelines(pipelines);
});

export { getSelectedPipelinesMock, getPipelinesMock, getFilteredPipelinesMock };
