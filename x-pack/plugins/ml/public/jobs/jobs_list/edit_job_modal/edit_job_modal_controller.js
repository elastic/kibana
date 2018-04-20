/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import 'plugins/ml/jobs/new_job/advanced/detectors_list_directive';
import './styles/main.less';
import angular from 'angular';
import numeral from '@elastic/numeral';

import { calculateDatafeedFrequencyDefaultSeconds } from 'plugins/ml/../common/util/job_utils';
import { parseInterval } from 'plugins/ml/../common/util/parse_interval';
import { CustomUrlEditorServiceProvider } from 'plugins/ml/jobs/components/custom_url_editor/custom_url_editor_service';
import { isWebUrl } from 'plugins/ml/util/string_utils';
import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlEditJobModal', function (
  $scope,
  $modalInstance,
  $modal,
  $window,
  params,
  Private,
  mlJobService,
  mlMessageBarService) {
  const msgs = mlMessageBarService;
  msgs.clear();
  $scope.saveLock = false;
  const refreshJob = params.pscope.refreshJob;

  $scope.job = angular.copy(params.job);

  const CUSTOM_URL_TIME_RANGE_AUTO = 'auto';

  const bucketSpan = parseInterval($scope.job.analysis_config.bucket_span);
  const jobLimits = newJobLimits();

  $scope.ui = {
    title: 'Edit ' + $scope.job.job_id,
    currentTab: 0,
    tabs: [
      { index: 0, title: 'Job Details', hidden: false },
      { index: 1, title: 'Detectors', hidden: false },
      { index: 2, title: 'Datafeed', hidden: true },
      { index: 3, title: 'Custom URLs', hidden: false }
    ],
    changeTab: function (tab) {
      $scope.ui.currentTab = tab.index;
    },
    isDatafeed: false,
    datafeedStopped: false,
    datafeed: {
      scrollSizeDefault: 1000,
      queryDelayDefault: '60s',
      frequencyDefault: calculateDatafeedFrequencyDefaultSeconds(bucketSpan.asSeconds()) + 's',
    },
    stoppingDatafeed: false,
    validation: {
      tabs: [{
        index: 0,
        valid: true,
        checks: {
          categorizationFilters: { valid: true },
          modelMemoryLimit: { valid: true }
        }
      }]
    },
    editingNewCustomUrl: false,
    modelMemoryLimitDefault: null
  };

  // extract datafeed settings
  if ($scope.job.datafeed_config) {
    const datafeedConfig = $scope.job.datafeed_config;
    $scope.ui.isDatafeed = true;
    $scope.ui.tabs[2].hidden = false;
    $scope.ui.datafeedStopped = (!$scope.job.datafeed_config || $scope.job.datafeed_config.state === 'stopped');

    $scope.ui.datafeed.queryText = angular.toJson(datafeedConfig.query, true);
    $scope.ui.datafeed.queryDelayText = datafeedConfig.query_delay;
    $scope.ui.datafeed.frequencyText = datafeedConfig.frequency;
    $scope.ui.datafeed.scrollSizeText = datafeedConfig.scroll_size;
  }

  // Add an 'auto' time for any URLs created before the time_range setting was added.
  if ($scope.job.custom_settings && $scope.job.custom_settings.custom_urls) {
    $scope.job.custom_settings.custom_urls.forEach((customUrl) => {
      if (customUrl.time_range === undefined) {
        customUrl.time_range = CUSTOM_URL_TIME_RANGE_AUTO;
      }
    });
  }

  // if the job is old, it may not have analysis_limit
  // so create an empty version
  if ($scope.job.analysis_limits === undefined) {
    $scope.job.analysis_limits  = {};
  } else {
    if ($scope.job.analysis_limits.model_memory_limit !== undefined) {
      // otherwise, set the default mml to the job's current mml
      $scope.ui.modelMemoryLimitDefault = $scope.job.analysis_limits.model_memory_limit;

      // if there is a max mml set for the node, make sure the default mml is not greater than it.
      if (jobLimits.max_model_memory_limit !== undefined) {
        const maxBytes = numeral(jobLimits.max_model_memory_limit.toUpperCase()).value();
        const mmlBytes = numeral($scope.job.analysis_limits.model_memory_limit.toUpperCase()).value();
        if (mmlBytes > maxBytes) {
          $scope.ui.modelMemoryLimitDefault = `${(maxBytes / numeral('1MB').value())}MB`;
        }
      }
    }
  }

  $scope.editNewCustomUrl = function () {
    $scope.ui.editingNewCustomUrl = true;
  };

  $scope.addCustomUrl = function (customUrl) {
    if (!$scope.job.custom_settings) {
      $scope.job.custom_settings = {};
    }
    if (!$scope.job.custom_settings.custom_urls) {
      $scope.job.custom_settings.custom_urls = [];
    }

    $scope.job.custom_settings.custom_urls.push(customUrl);

    $scope.ui.editingNewCustomUrl = false;
  };

  $scope.removeCustomUrl = function (index) {
    $scope.job.custom_settings.custom_urls.splice(index, 1);
  };

  $scope.customUrlTimeRangeChanged = function (index) {
    const customUrl = $scope.job.custom_settings.custom_urls[index];
    const timeRange = customUrl.time_range;
    const interval = parseInterval(timeRange);
    customUrl.timeRangeError = (interval === null && timeRange !== CUSTOM_URL_TIME_RANGE_AUTO);
  };

  $scope.showTestLinkForCustomUrl = function (index) {
    return isWebUrl($scope.job.custom_settings.custom_urls[index].url_value);
  };

  $scope.testCustomUrl = function (index) {
    const customUrlEditorService = Private(CustomUrlEditorServiceProvider);
    customUrlEditorService.getTestUrl(
      $scope.job,
      $scope.job.custom_settings.custom_urls[index])
      .then((testUrl) => {
        $window.open(testUrl, '_blank');
      })
      .catch((resp) => {
        console.log('testCustomUrl() - error obtaining URL for test:', resp);
      });
  };

  // add new categorization filter
  $scope.addCategorizationFilter = function () {
    if ($scope.job.analysis_config) {
      if (!$scope.job.analysis_config.categorization_filters) {
        $scope.job.analysis_config.categorization_filters = [];
      }

      $scope.job.analysis_config.categorization_filters.push('');
    }
  };

  // remove selected categorization filter
  $scope.removeCategorizationFilter = function (index) {
    if ($scope.job.analysis_config && $scope.job.analysis_config.categorization_filters) {
      $scope.job.analysis_config.categorization_filters.splice(index, 1);
    }
  };

  // convenient function to stop the datafeed from inside the edit dialog
  $scope.stopDatafeed = function () {
    const datafeedId = $scope.job.datafeed_config.datafeed_id;
    const jobId = $scope.job.job_id;
    $scope.ui.stoppingDatafeed = true;
    mlJobService.stopDatafeed(datafeedId, jobId)
      .then((resp) => {
        if (resp.stopped === true) {
          $scope.ui.datafeedStopped = true;
        }
      });
  };

  function validateJob() {
    let valid = true;
    const tabs = $scope.ui.validation.tabs;
    // reset validations
    _.each(tabs,  (tab) => {
      tab.valid = true;
      _.each(tab.checks, (check, c) => {
        tab.checks[c].valid = true;
        tab.checks[c].message = '';
      });
    });

    if ($scope.job.analysis_config.categorization_filters) {
      let v = true;
      _.each($scope.job.analysis_config.categorization_filters, (d) => {
        try {
          new RegExp(d);
        } catch (e) {
          v = false;
        }

        if (d === '' || v === false) {
          tabs[0].checks.categorization_filters.valid = false;
          valid = false;
        }
      });
    }

    const mml = $scope.job.analysis_limits.model_memory_limit;
    const maxMml = jobLimits.max_model_memory_limit;
    if (maxMml !== undefined && (mml !== undefined || mml !== '')) {
      const maxBytes = numeral(maxMml.toUpperCase()).value();
      const mmlBytes = numeral(mml.toUpperCase()).value();
      if (mmlBytes > maxBytes) {
        tabs[0].checks.modelMemoryLimit.valid = false;
        const msg = `Model memory limit cannot be higher than the maximum value of ${maxMml}`;
        tabs[0].checks.modelMemoryLimit.message = msg;
        valid = false;
      }
    }
    return valid;
  }

  $scope.save = function () {
    msgs.clear();

    if (validateJob() === false) {
      return;
    }

    $scope.saveLock = true;

    const jobId = $scope.job.job_id;
    const jobData = {};
    const datafeedData = {};

    // if the job description has changed, add it to the jobData json
    if ($scope.job.description !== params.job.description) {
      jobData.description = $scope.job.description;
    }

    // if groups exist, add it to the jobData json
    if (Array.isArray($scope.job.groups)) {
      jobData.groups = $scope.job.groups;
    }

    // if the job's model_memory_limit has changed, add it to the jobData json
    if ($scope.job.analysis_limits.model_memory_limit !== undefined) {
      let mml = $scope.job.analysis_limits.model_memory_limit;
      // if the user has wiped the mml, use the default value which is
      // displayed greyed out in the field
      if (mml === '') {
        mml = $scope.ui.modelMemoryLimitDefault;
      }

      // has the data changed, did analysis_limits never exist for this job
      if (params.job.analysis_limits === undefined ||
        mml !== params.job.analysis_limits.model_memory_limit) {
        jobData.analysis_limits = {
          model_memory_limit: mml
        };
      }
    }

    // check each detector. if the description or filters have changed, add it to the jobData json
    _.each($scope.job.analysis_config.detectors, (d, i) => {
      let changes = 0;

      const obj = {
        detector_index: i,
      };

      if (d.detector_description !== params.job.analysis_config.detectors[i].detector_description) {
        obj.description = d.detector_description;
        changes++;
      }

      if (changes > 0) {
        if (jobData.detectors === undefined) {
          jobData.detectors = [];
        }
        jobData.detectors.push(obj);
      }
    });

    // check each categorization filter. if any have changed, add all to the jobData json
    if ($scope.job.analysis_config.categorization_filters) {
      let doUpdate = false;

      // array lengths are different
      if ($scope.job.analysis_config.categorization_filters.length !== params.job.analysis_config.categorization_filters.length) {
        doUpdate = true;
      }

      _.each($scope.job.analysis_config.categorization_filters, (d, i) => {
        if (d !== params.job.analysis_config.categorization_filters[i]) {
          doUpdate = true;
        }
      });

      if (doUpdate) {
        jobData.categorization_filters = $scope.job.analysis_config.categorization_filters;
      }
    }

    // check custom settings
    if ($scope.job.custom_settings) {
      if ($scope.job.custom_settings.custom_urls &&
         $scope.job.custom_settings.custom_urls.length) {

        let doUpdate = false;

        if (!params.job.custom_settings ||
           !params.job.custom_settings.custom_urls ||
           !params.job.custom_settings.custom_urls.length) {
          // custom urls did not originally exist
          doUpdate = true;
        }
        else if ($scope.job.custom_settings.custom_urls.length !== params.job.custom_settings.custom_urls.length) {
          // if both existed but now have different lengths
          doUpdate = true;
        } else {
          // if lengths are the same, check the contents match.
          _.each($scope.job.custom_settings.custom_urls, (url, i) => {
            if (url.url_name !== params.job.custom_settings.custom_urls[i].url_name ||
               url.url_value !== params.job.custom_settings.custom_urls[i].url_value ||
               url.time_range !== params.job.custom_settings.custom_urls[i].time_range) {
              doUpdate = true;
            }
          });
        }

        if (doUpdate) {
          jobData.custom_settings = $scope.job.custom_settings;
          // Clear any error properties as these are just used by the modal.
          $scope.job.custom_settings.custom_urls.forEach((customUrl) => {
            delete customUrl.timeRangeError;
          });
        }
      } else {
        if (params.job.custom_settings ||
           params.job.custom_settings.custom_urls ||
           params.job.custom_settings.custom_urls.length) {
          // if urls originally existed, but now don't
          // clear the custom settings completely
          jobData.custom_settings = {};
        }
      }
    }

    // check datafeed
    if ($scope.job.datafeed_config && $scope.ui.datafeedStopped) {
      const sch = $scope.ui.datafeed;

      // set query text
      if (sch.queryText === '') {
        sch.queryText = '{"match_all":{}}';
      }
      let query = sch.queryText;
      try {
        query = JSON.parse(query);
      } catch (e) {
        console.log('save(): could not parse query JSON');
      }

      const originalQueryText = angular.toJson($scope.job.datafeed_config.query, true);
      // only update if it has changed from the original
      if (originalQueryText !== sch.queryText) {
        datafeedData.query = query;
      }

      // only update fields if they have changed from the original
      if (sch.queryDelayText !== $scope.job.datafeed_config.query_delay) {
        datafeedData.query_delay = ((sch.queryDelayText === '' || sch.queryDelayText === null || sch.queryDelayText === undefined)
          ? sch.queryDelayDefault : sch.queryDelayText);
      }

      if (sch.frequencyText !== $scope.job.datafeed_config.frequency) {
        datafeedData.frequency = ((sch.frequencyText === '' || sch.frequencyText === null || sch.frequencyText === undefined)
          ? sch.frequencyDefault : sch.frequencyText);
      }

      if (sch.scrollSizeText !== $scope.job.datafeed_config.scroll_size) {
        datafeedData.scroll_size = ((sch.scrollSizeText === '' || sch.scrollSizeText === null || sch.scrollSizeText === undefined)
          ? sch.scrollSizeDefault : sch.scrollSizeText);
      }
    }

    // if anything has changed, post the changes
    if (Object.keys(jobData).length) {
      mlJobService.updateJob(jobId, jobData)
        .then((resp) => {
          if (resp.success) {
            saveDatafeed();
          } else {
            saveFail(resp);
          }
        });
    } else {
      saveDatafeed();
    }

    function saveDatafeed() {
      if (Object.keys(datafeedData).length) {
        const datafeedId = $scope.job.datafeed_config.datafeed_id;
        mlJobService.updateDatafeed(datafeedId, datafeedData)
          .then((resp) => {
            if (resp.success) {
              saveComplete();
            } else {
              saveFail(resp);
            }
          });
      } else {
        saveComplete();
      }
    }

    function saveComplete() {
      $scope.saveLock = false;
      msgs.clear();
      refreshJob(jobId);

      $modalInstance.close();
    }

    function saveFail(resp) {
      $scope.saveLock = false;
      msgs.error(resp.message);
    }

  };

  $scope.cancel = function () {
    msgs.clear();
    $modalInstance.close();
  };
});
