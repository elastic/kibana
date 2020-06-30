/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { LegacyAPICaller } from 'kibana/server';

import { DetectorRule, DetectorRuleScope } from '../../../common/types/detector_rules';

export interface Filter {
  filter_id: string;
  description?: string;
  items: string[];
}

export interface FormFilter {
  filterId: string;
  description?: string;
  addItems?: string[];
  removeItems?: string[];
}

export interface FilterRequest {
  filter_id: string;
  description?: string;
  add_items?: string[];
  remove_items?: string[];
}

interface FilterUsage {
  jobs: string[];
  detectors: string[];
}

interface FilterStats {
  filter_id: string;
  description?: string;
  item_count: number;
  used_by: FilterUsage;
}

interface FiltersInUse {
  [id: string]: FilterUsage;
}

interface PartialDetector {
  detector_description: string;
  custom_rules: DetectorRule[];
}

interface PartialJob {
  job_id: string;
  analysis_config: {
    detectors: PartialDetector[];
  };
}

export class FilterManager {
  constructor(private callAsCurrentUser: LegacyAPICaller) {}

  async getFilter(filterId: string) {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this.callAsCurrentUser('ml.jobs'),
        this.callAsCurrentUser('ml.filters', { filterId }),
      ]);

      if (results[FILTERS] && results[FILTERS].filters.length) {
        let filtersInUse: FiltersInUse = {};
        if (results[JOBS] && results[JOBS].jobs) {
          filtersInUse = this.buildFiltersInUse(results[JOBS].jobs);
        }

        const filter = results[FILTERS].filters[0];
        filter.used_by = filtersInUse[filter.filter_id];
        return filter;
      } else {
        throw Boom.notFound(`Filter with the id "${filterId}" not found`);
      }
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilters() {
    try {
      const filtersResp = await this.callAsCurrentUser('ml.filters');
      return filtersResp.filters;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async getAllFilterStats() {
    try {
      const [JOBS, FILTERS] = [0, 1];
      const results = await Promise.all([
        this.callAsCurrentUser('ml.jobs'),
        this.callAsCurrentUser('ml.filters'),
      ]);

      // Build a map of filter_ids against jobs and detectors using that filter.
      let filtersInUse: FiltersInUse = {};
      if (results[JOBS] && results[JOBS].jobs) {
        filtersInUse = this.buildFiltersInUse(results[JOBS].jobs);
      }

      // For each filter, return just
      //  filter_id
      //  description
      //  item_count
      //  jobs using the filter
      const filterStats: FilterStats[] = [];
      if (results[FILTERS] && results[FILTERS].filters) {
        results[FILTERS].filters.forEach((filter: Filter) => {
          const stats: FilterStats = {
            filter_id: filter.filter_id,
            description: filter.description,
            item_count: filter.items.length,
            used_by: filtersInUse[filter.filter_id],
          };
          filterStats.push(stats);
        });
      }

      return filterStats;
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async newFilter(filter: FormFilter) {
    const filterId = filter.filterId;
    delete filter.filterId;
    try {
      // Returns the newly created filter.
      return await this.callAsCurrentUser('ml.addFilter', { filterId, body: filter });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async updateFilter(filterId: string, filter: FormFilter) {
    try {
      const body: FilterRequest = { filter_id: filterId };
      if (filter.description !== undefined) {
        body.description = filter.description;
      }
      if (filter.addItems !== undefined) {
        body.add_items = filter.addItems;
      }
      if (filter.removeItems !== undefined) {
        body.remove_items = filter.removeItems;
      }

      // Returns the newly updated filter.
      return await this.callAsCurrentUser('ml.updateFilter', {
        filterId,
        body,
      });
    } catch (error) {
      throw Boom.badRequest(error);
    }
  }

  async deleteFilter(filterId: string) {
    return this.callAsCurrentUser('ml.deleteFilter', { filterId });
  }

  buildFiltersInUse(jobsList: PartialJob[]) {
    // Build a map of filter_ids against jobs and detectors using that filter.
    const filtersInUse: FiltersInUse = {};
    jobsList.forEach((job) => {
      const detectors = job.analysis_config.detectors;
      detectors.forEach((detector) => {
        if (detector.custom_rules) {
          const rules = detector.custom_rules;
          rules.forEach((rule) => {
            if (rule.scope) {
              const ruleScope: DetectorRuleScope = rule.scope;
              const scopeFields = Object.keys(ruleScope);
              scopeFields.forEach((scopeField) => {
                const filter = ruleScope[scopeField];
                const filterId = filter.filter_id;
                if (filtersInUse[filterId] === undefined) {
                  filtersInUse[filterId] = { jobs: [], detectors: [] };
                }

                const jobs = filtersInUse[filterId].jobs;
                const dtrs = filtersInUse[filterId].detectors;
                const jobId = job.job_id;

                // Label the detector with the job it comes from.
                const detectorLabel = `${detector.detector_description} (${jobId})`;
                if (jobs.indexOf(jobId) === -1) {
                  jobs.push(jobId);
                }

                if (dtrs.indexOf(detectorLabel) === -1) {
                  dtrs.push(detectorLabel);
                }
              });
            }
          });
        }
      });
    });

    return filtersInUse;
  }
}
