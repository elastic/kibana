/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import angular from 'angular';
import 'ace';
import 'ui/angular_ui_select';
import 'ui/directives/input_focus';

import { parseInterval } from 'ui/utils/parse_interval';
import { timefilter } from 'ui/timefilter';

import uiRoutes from 'ui/routes';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkCreateJobsPrivilege } from 'plugins/ml/privilege/check_privilege';
import template from './new_job.html';
import saveStatusTemplate from 'plugins/ml/jobs/new_job/advanced/save_status_modal/save_status_modal.html';
import { getAdvancedJobConfigurationBreadcrumbs } from 'plugins/ml/jobs/breadcrumbs';
import {
  SearchItemsProvider,
  createJobForSaving,
  checkCardinalitySuccess,
  getMinimalValidJob,
} from 'plugins/ml/jobs/new_job/utils/new_job_utils';
import { loadIndexPatterns, loadCurrentIndexPattern, loadCurrentSavedSearch, timeBasedIndexCheck } from 'plugins/ml/util/index_utils';
import { ML_JOB_FIELD_TYPES, ES_FIELD_TYPES } from 'plugins/ml/../common/constants/field_types';
import { ALLOWED_DATA_UNITS } from 'plugins/ml/../common/constants/validation';
import { checkMlNodesAvailable } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { loadNewJobDefaults, newJobLimits, newJobDefaults } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import {
  calculateDatafeedFrequencyDefaultSeconds as juCalculateDatafeedFrequencyDefaultSeconds,
  ML_DATA_PREVIEW_COUNT,
  basicJobValidation
} from 'plugins/ml/../common/util/job_utils';
import { mlJobService } from 'plugins/ml/services/job_service';
import { mlMessageBarService } from 'plugins/ml/components/messagebar/messagebar_service';
import { ml } from 'plugins/ml/services/ml_api_service';

uiRoutes
  .when('/jobs/new_job/advanced', {
    template,
    k7Breadcrumbs: getAdvancedJobConfigurationBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      indexPatterns: loadIndexPatterns,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      loadNewJobDefaults,
    }
  })
  .when('/jobs/new_job/advanced/:jobId', {
    template,
    k7Breadcrumbs: getAdvancedJobConfigurationBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkCreateJobsPrivilege,
      indexPattern: loadCurrentIndexPattern,
      indexPatterns: loadIndexPatterns,
      savedSearch: loadCurrentSavedSearch,
      checkMlNodesAvailable,
      loadNewJobDefaults,
    }
  });

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.controller('MlNewJob',
  function ($scope, $route, $location, $modal, Private, mlConfirmModalService) {

    timefilter.disableTimeRangeSelector(); // remove time picker from top of page
    timefilter.disableAutoRefreshSelector(); // remove time picker from top of page
    const MODE = {
      NEW: 0,
      EDIT: 1,
      CLONE: 2
    };

    const INDEX_INPUT_TYPE = {
      TEXT: 'TEXT',
      LIST: 'LIST'
    };
    $scope.INDEX_INPUT_TYPE = INDEX_INPUT_TYPE;

    const fieldsToIgnore = [
      '_id',
      '_field_names',
      '_index',
      '_parent',
      '_routing',
      '_seq_no',
      '_source',
      '_type',
      '_uid',
      '_version',
      '_feature',
      '_ignored',
    ];

    const allowedInfluencerTypes = [
      ES_FIELD_TYPES.TEXT,
      ES_FIELD_TYPES.KEYWORD,
      ES_FIELD_TYPES.IP
    ];

    // ui model, used to store and control job data that wont be posted to the server.
    const msgs = mlMessageBarService;
    const mlConfirm = mlConfirmModalService;
    msgs.clear();
    const jobDefaults = newJobDefaults();
    // For keeping a copy of the detectors for comparison
    const currentConfigs = { detectors: [], model_plot_config: { enabled: false } };

    $scope.job = {};
    $scope.mode = MODE.NEW;
    $scope.saveLock = false;
    $scope.indices = {};
    $scope.fields = {};
    $scope.dateFields = {};
    $scope.catFields = {};
    $scope.maximumFileSize;
    $scope.mlElasticDataDescriptionExposedFunctions = {};
    $scope.elasticServerInfo = {};
    $scope.jobGroupsUpdateFunction = {};

    $scope.enterJobNameLabel = i18n.translate('xpack.ml.newJob.advanced.jobDetails.enterJobNameLabel', {
      defaultMessage: 'Enter a name for the job'
    });
    $scope.bucketSpanNotValidFormatLabel = i18n.translate('xpack.ml.newJob.advanced.analysisConfiguration.bucketSpanNotValidFormatLabel', {
      defaultMessage: '{bucketSpan} is not a valid time interval format',
      values: { bucketSpan: 'bucket_span' }
    });
    $scope.categorizationFiltersNotValidLabel = i18n.translate(
      'xpack.ml.newJob.advanced.analysisConfiguration.categorizationFiltersNotValidLabel', {
        defaultMessage: 'Categorization filters must all be valid regular expressions'
      });
    $scope.detectorNotConfiguredLabel = i18n.translate('xpack.ml.newJob.advanced.analysisConfiguration.detectorNotConfiguredLabel', {
      defaultMessage: 'At least one detector should be configured'
    });
    $scope.influencerNotSelectedLabel = i18n.translate('xpack.ml.newJob.advanced.analysisConfiguration.influencerNotSelectedLabel', {
      defaultMessage: 'At least one influencer should be selected'
    });
    $scope.validatingCardinalityLabel = i18n.translate('xpack.ml.newJob.advanced.analysisConfiguration.validatingCardinalityLabel', {
      defaultMessage: 'Validating cardinality…'
    });
    $scope.enableModelPlotLabel = i18n.translate('xpack.ml.newJob.advanced.analysisConfiguration.enableModelPlotLabel', {
      defaultMessage: 'Enable model plot'
    });
    $scope.specifyTimeFieldLabel = i18n.translate('xpack.ml.newJob.advanced.dataDescription.specifyTimeFieldLabel', {
      defaultMessage: 'Time field should be specified'
    });
    $scope.specifyTimeFormatLabel = i18n.translate('xpack.ml.newJob.advanced.dataDescription.specifyTimeFormatLabel', {
      defaultMessage: 'Time format should be specified'
    });

    $scope.ui = {
      pageTitle: i18n.translate('xpack.ml.newJob.advanced.createNewJobTitle', {
        defaultMessage: 'Create a new job'
      }),
      dataLocation: 'ES',
      dataPreview: '',
      currentTab: 0,
      tabs: [
        { index: 0, title: i18n.translate(
          'xpack.ml.newJob.advanced.tabs.jobDetailsLabel', { defaultMessage: 'Job Details' }) },
        { index: 1, title: i18n.translate(
          'xpack.ml.newJob.advanced.tabs.analysisConfigurationLabel', { defaultMessage: 'Analysis Configuration' }) },
        {
          index: 2,
          title: i18n.translate('xpack.ml.newJob.advanced.tabs.dataDescriptionLabel', { defaultMessage: 'Data Description' }),
          hidden: true
        },
        { index: 3, title: i18n.translate(
          'xpack.ml.newJob.advanced.tabs.datafeedLabel', { defaultMessage: 'Datafeed' }) },
        { index: 4, title: i18n.translate('xpack.ml.newJob.advanced.tabs.editJsonLabel', { defaultMessage: 'Edit JSON' }) },
        { index: 5, title: i18n.translate(
          'xpack.ml.newJob.advanced.tabs.dataPreviewLabel', { defaultMessage: 'Data Preview' }), hidden: true },
      ],
      validation: {
        tabs: [
          { index: 0, valid: true, checks: { jobId: { valid: true }, groupIds: { valid: true }, modelMemoryLimit: { valid: true } } },
          { index: 1, valid: true, checks: {
            detectors: { valid: true }, influencers: { valid: true }, categorizationFilters: { valid: true }, bucketSpan: { valid: true }
          } },
          { index: 2, valid: true, checks: { timeField: { valid: true }, timeFormat: { valid: true } } },
          { index: 3, valid: true, checks: { isDatafeed: { valid: true }, hasAccessToIndex: { valid: true } } },
          { index: 4, valid: true, checks: {} },
          { index: 5, valid: true, checks: {} },
        ],
        setTabValid: function (tab, valid) {
          $scope.ui.validation.tabs[tab].valid = valid;
        }
      },
      cardinalityValidator: {
        status: 0, message: '', STATUS: {
          FAILED: -1,
          NOT_RUNNING: 0,
          RUNNING: 1,
          FINISHED: 2,
          WARNING: 3,
        }
      },
      jsonText: '',
      changeTab: changeTab,
      influencers: [],
      allInfluencers: allInfluencers,
      customInfluencers: [],
      tempCustomInfluencer: '',
      inputDataFormat: [
        { value: 'delimited',     title: i18n.translate('xpack.ml.newJob.advanced.delimitedLabel', { defaultMessage: 'Delimited' }) },
        { value: 'json',          title: 'JSON' },
      ],
      fieldDelimiterOptions: [
        { value: '\t',      title: i18n.translate('xpack.ml.newJob.advanced.tabLabel', { defaultMessage: 'tab' }) },
        { value: ' ',       title: i18n.translate('xpack.ml.newJob.advanced.spaceLabel', { defaultMessage: 'space' }) },
        { value: ',',       title: ',' },
        { value: ';',       title: ';' },
        { value: 'custom',  title: i18n.translate('xpack.ml.newJob.advanced.customLabel', { defaultMessage: 'custom' }) }
      ],
      selectedFieldDelimiter: ',',
      customFieldDelimiter: '',
      indexTextOk: false,
      fieldsUpToDate: false,
      indices: {},
      isDatafeed: true,
      useDedicatedIndex: false,
      enableModelPlot: false,
      modelMemoryLimit: '',
      modelMemoryLimitDefault: jobDefaults.anomaly_detectors.model_memory_limit,

      datafeed: {
        queryText: '{"match_all":{}}',
        queryDelayText: '',
        queryDelayDefault: '60s',
        frequencyText: '',
        frequencyDefault: '',
        scrollSizeText: '',
        scrollSizeDefault: 1000,
        indicesText: '',
        scriptFields: [],
      },
      saveStatus: {
        job: 0,
      }
    };

    function init() {
    // load the jobs list for job id validation later on
      mlJobService.loadJobs();

      // check to see whether currentJob is set.
      // if it is, this isn't a new job, it's either a clone or an edit.
      if (mlJobService.currentJob) {
      // try to get the jobId from the url.
      // if it's set, this is a job edit
        const jobId = $route.current.params.jobId;

        // make a copy of the currentJob object. so we don't corrupt the real job
        $scope.job = mlJobService.cloneJob(mlJobService.currentJob);

        if (jobId) {
          $scope.mode = MODE.EDIT;
          console.log('Editing job', mlJobService.currentJob);
          $scope.ui.pageTitle = i18n.translate('xpack.ml.newJob.advanced.editingJobPageTitle', {
            defaultMessage: 'Editing Job {jobId}',
            values: { jobId: $scope.job.job_id }
          });
        } else {
          // if the job_version is undefined, assume we have transferred to this page from
          // a new job wizard.
          // Alternatively, we are cloning a job and so the job already has a job_version
          if (mlJobService.currentJob.job_version === undefined) {
            $scope.mode = MODE.NEW;

            // if results_index_name exists, the dedicated index checkbox has been checked
            if ($scope.job.results_index_name !== undefined) {
              $scope.ui.useDedicatedIndex = true;
            }
          } else {
            $scope.mode = MODE.CLONE;
            console.log('Cloning job', mlJobService.currentJob);
            $scope.ui.pageTitle = i18n.translate('xpack.ml.newJob.advanced.cloneJobFromPageTitle', {
              defaultMessage: 'Clone Job from {jobId}',
              values: { jobId: $scope.job.job_id }
            });
            $scope.job.job_id = '';

            if ($scope.job.results_index_name === 'shared') {
              delete $scope.job.results_index_name;
            } else {
              $scope.ui.useDedicatedIndex = true;
              $scope.job.results_index_name = '';
            }
          }
          setDatafeedUIText();
          setFieldDelimiterControlsFromText();

          // if the datafeedConfig doesn't exist, assume we're cloning from a job with no datafeed
          if (!$scope.job.datafeed_config) {
            $scope.ui.dataLocation = 'NONE';

            $scope.ui.influencers = angular.copy($scope.job.analysis_config.influencers);
          }

          if ($scope.job.analysis_limits && $scope.job.analysis_limits.model_memory_limit) {
            $scope.ui.modelMemoryLimitText = $scope.job.analysis_limits.model_memory_limit;
          }
        }

        // clear the current job
        mlJobService.currentJob = undefined;

      } else {
        $scope.mode = MODE.NEW;
        console.log('Creating new job');
        $scope.job = mlJobService.getBlankJob();
        $scope.job.data_description.format = 'json';
        delete $scope.job.data_description.time_format;
        delete $scope.job.data_description.format;

        populateFormFromUrl();
      }

      loadFields()
        .then(() => {
          calculateDatafeedFrequencyDefaultSeconds();
          showDataPreviewTab();
        })
        .catch(() => {
          calculateDatafeedFrequencyDefaultSeconds();
        });
    }

    function checkForConfigUpdates() {
      const { STATUS } = $scope.ui.cardinalityValidator;
      // Check if enable model plot was set/has changed and update if it has.
      const jobModelPlotValue = $scope.job.model_plot_config ? $scope.job.model_plot_config : { enabled: false };
      const modelPlotSettingsEqual = _.isEqual(currentConfigs.model_plot_config, jobModelPlotValue);

      if (!modelPlotSettingsEqual) {
        // Update currentConfigs.
        currentConfigs.model_plot_config.enabled = jobModelPlotValue.enabled;
        // Update ui portion so checkbox is checked
        $scope.ui.enableModelPlot = jobModelPlotValue.enabled;
      }

      if ($scope.ui.enableModelPlot === true) {
        const unchanged = _.isEqual(currentConfigs.detectors, $scope.job.analysis_config.detectors);
        // if detectors changed OR model plot was just toggled on run cardinality
        if (!unchanged || !modelPlotSettingsEqual) {
          runValidateCardinality();
        }
      } else {
        $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
        $scope.ui.cardinalityValidator.message = '';
      }
    }

    function changeTab(tab) {
      $scope.ui.currentTab = tab.index;
      // Selecting Analysis Configuration tab
      if (tab.index === 1) {
        checkForConfigUpdates();
      } else if (tab.index === 4) {
        createJSONText();
      } else if (tab.index === 5) {
        if ($scope.ui.dataLocation === 'ES') {
          loadDataPreview();
        }
      }
    }

    $scope.indexChanged = function () {
      $scope.ui.fieldsUpToDate = false;
    };

    $scope.loadFields = function () {
      loadFields()
        .catch(() => {
          // No need to do anything here as loadFields handles the displaying of any errors.
        })
        .then(() => {
          $scope.$applyAsync();
        });
    };

    function loadFields() {
      return new Promise((resolve, reject) => {
        clear($scope.fields);
        clear($scope.dateFields);
        clear($scope.catFields);
        clear($scope.ui.influencers);

        const index = $scope.ui.datafeed.indicesText;
        if (index !== '') {
          ml.getFieldCaps({ index })
            .then((resp) => {
              $scope.ui.fieldsUpToDate = true;
              if (resp.fields !== undefined) {
                _.each(resp.fields, (field, fieldName) => {
                  _.each(field, (type) => {
                    if (fieldsToIgnore.indexOf(fieldName) === -1) {

                      let addField = true;
                      if (fieldName.match(/\.keyword$/)) {
                        // if this is a keyword version of a field, check to see whether a non-keyword
                        // version has already been added. if so, delete it.
                        const keywordLess = fieldName.replace('.keyword');
                        if ($scope.fields[keywordLess] !== undefined) {
                          delete $scope.fields[keywordLess];
                        }
                      } else if ($scope.fields[`${fieldName}.keyword`] !== undefined) {
                        // if this is not a keyword version of a field, but a keyword version has already been
                        // added, don't add this field.
                        addField = false;
                      }

                      if (addField) {
                        $scope.fields[fieldName] = type;

                        if (type.type === ML_JOB_FIELD_TYPES.DATE) {
                          $scope.dateFields[fieldName] = type;
                        }
                        if (type.type === ML_JOB_FIELD_TYPES.TEXT || type.type === ML_JOB_FIELD_TYPES.KEYWORD) {
                          $scope.catFields[fieldName] = type;
                        }
                        if (allowedInfluencerTypes.indexOf(type.type) !== -1) {
                          $scope.ui.influencers.push(fieldName);
                        }
                      }
                    }
                  });
                });
              }

              // Add script fields from the job configuration to $scope.fields
              // so they're available from within the dropdown in the detector modal.
              const scriptFields = Object.keys(_.get($scope.job, 'datafeed_config.script_fields', {}));
              // This type information is retrieved via fieldCaps for regular fields,
              // here we're creating a similar object so the script field is usable further on.
              const scriptType = { type: 'script_fields', searchable: false, aggregatable: true };
              scriptFields.forEach((fieldName) => {
                $scope.fields[fieldName] = scriptType;
              });

              if (Object.keys($scope.fields).length) {
                $scope.ui.indexTextOk = true;
              }
              validateIndex($scope.ui.validation.tabs);
              guessTimeField();
              resolve();
            })
            .catch((error) => {
              $scope.ui.indexTextOk = false;
              validateIndex($scope.ui.validation.tabs);
              reject(error);
            });
        } else {
          reject();
        }
      });
    }

    function guessTimeField() {
      let currentTimeField = $scope.job.data_description.time_field;
      if ($scope.dateFields[currentTimeField] === undefined) {
        currentTimeField = '';
        $scope.job.data_description.time_field = '';
      }
      if (currentTimeField === '' && Object.keys($scope.dateFields).length) {
        $scope.job.data_description.time_field = Object.keys($scope.dateFields)[0];
        console.log('guessTimeField: guessed time fields: ', $scope.job.data_description.time_field);
      }
    }

    // isCurrentJobConfig is used to track if the form configuration
    // changed since the last job validation was done
    $scope.isCurrentJobConfig = false;
    // need to pass true as third argument here to track granular changes
    $scope.$watch('job', () => { $scope.isCurrentJobConfig = false; }, true);
    $scope.getJobConfig = function () {
      getDelimiterSelection();
      getDatafeedSelection();
      getAnalysisLimitsSelection();
      $scope.isCurrentJobConfig = true;
      return $scope.job;
    };

    $scope.save = function () {
      console.log('save() job: ', $scope.job);
      msgs.clear();
      getDelimiterSelection();
      getDatafeedSelection();
      getAnalysisLimitsSelection();

      const jobValid = validateJob();

      if (jobValid.valid) {
      // if basic validation passes
      // refresh jobs list to check that the job id doesn't already exist.
        mlJobService.loadJobs()
          .then(() => {
            // check that the job id doesn't already exist
            const tempJob = mlJobService.getJob($scope.job.job_id);
            if (tempJob) {
              const tab = $scope.ui.validation.tabs[0];
              tab.valid = false;
              tab.checks.jobId.valid = false;
              tab.checks.jobId.message = i18n.translate('xpack.ml.newJob.advanced.jobAlreadyExistsLabel', {
                defaultMessage: `'{jobId}' already exists, please choose a different name`,
                values: { jobId: $scope.job.job_id }
              });
              changeTab({ index: 0 });
              $scope.$applyAsync();
            } else {
              checkInfluencers();
            }

            function checkInfluencers() {
              // check that they have chosen some influencers
              if ($scope.job.analysis_config.influencers &&
             $scope.job.analysis_config.influencers.length) {
                saveFunc();
              } else {
                // if there are no influencers set, open a confirmation
                mlConfirm.open({
                  message: i18n.translate('xpack.ml.newJob.advanced.noInfluencersChosenConfirmModalDescription', {
                    defaultMessage: 'You have not chosen any influencers, do you want to continue?'
                  }),
                  title: i18n.translate('xpack.ml.newJob.advanced.noInfluencersChosenConfirmModalTitle', {
                    defaultMessage: 'No Influencers'
                  })
                })
                  .then(saveFunc)
                  .catch(() => {
                    changeTab({ index: 1 });
                  });
              }
            }

            function saveFunc() {

              if ($scope.ui.useDedicatedIndex) {
                // if the dedicated index checkbox has been ticked
                // and the user hasn't added a custom value for it
                // in the JSON, use the job id.
                if ($scope.job.results_index_name === '') {
                  $scope.job.results_index_name = $scope.job.job_id;
                }
              } else {
                // otherwise delete it, just to be sure.
                delete $scope.job.results_index_name;
              }

              $scope.saveLock = true;
              $scope.ui.saveStatus.job = 1;
              openSaveStatusWindow();

              const job = createJobForSaving($scope.job);

              mlJobService.saveNewJob(job)
                .then((result) => {
                  if (result.success) {
                    // TODO - re-enable the refreshing of the index pattern fields once there is a
                    // resolution to https://github.com/elastic/kibana/issues/9466
                    // In the meantime, to prevent the aggregatable and searchable properties of any
                    // fields configured in the job (i.e. influencer, by, over, partition field_name/value)
                    // but not present in any results being set back to false by Kibana's call to the
                    // field stats API, comment out the call to refreshFields().
                    // The user will have to hit the 'Refresh field List' button in Kibana's Index Patterns
                    // management page for the .ml-anomalies-* index pattern for any new fields.
                    //
                    // After the job has been successfully created the Elasticsearch
                    // mappings should be fully set up, but the Kibana mappings then
                    // need to be refreshed to reflect the Elasticsearch mappings for
                    // any new analytical fields that have been configured in the job.
                    //indexPatterns.get('.ml-anomalies-*')
                    //.then((indexPattern) => {
                    //  indexPattern.refreshFields()
                    //  .then(() => {
                    //    console.log('refreshed fields for index pattern .ml-anomalies-*');
                    //    wait for mappings refresh before continuing on with the post save stuff
                    msgs.info(
                      i18n.translate('xpack.ml.newJob.advanced.newJobAddedNotificationMessage', {
                        defaultMessage: `New Job '{jobId}' added`,
                        values: { jobId: result.resp.job_id }
                      })
                    );
                    // update status
                    $scope.ui.saveStatus.job = 2;
                    $scope.$applyAsync();

                    // save successful, attempt to open the job
                    mlJobService.openJob($scope.job.job_id)
                      .then(() => {
                        saveNewDatafeed($scope.job.datafeed_config, $scope.job.job_id);
                      })
                      .catch((resp) => {
                        msgs.error(
                          i18n.translate('xpack.ml.newJob.advanced.couldNotOpenJobErrorMessage', {
                            defaultMessage: 'Could not open job:'
                          }),
                          resp
                        );
                        msgs.error(
                          i18n.translate('xpack.ml.newJob.advanced.jobCreatedAndCreatingDatafeedAnywayErrorMessage', {
                            defaultMessage: 'Job created, creating datafeed anyway'
                          })
                        );
                        saveNewDatafeed($scope.job.datafeed_config, $scope.job.job_id);
                      });

                    function saveNewDatafeed(datafeedConfig, jobId) {
                      if (datafeedConfig) {
                        // open job successful, create a new datafeed
                        mlJobService.saveNewDatafeed(datafeedConfig, jobId)
                          .then((resp) => {
                            datafeedConfig.datafeed_id = resp.datafeed_id;
                            $scope.saveLock = false;
                          })
                          .catch((resp) => {
                            msgs.error(
                              i18n.translate('xpack.ml.newJob.advanced.couldNotCreateDatafeedErrorMessage', {
                                defaultMessage: 'Could not create datafeed:'
                              }),
                              resp
                            );
                            $scope.saveLock = false;
                          })
                          .then(() => {
                            $scope.$applyAsync();
                          });
                      } else {
                        // no datafeed, so save is complete
                        $scope.saveLock = false;
                        $scope.$applyAsync();
                      }
                    }

                    // });
                    //  });
                  } else {
                    // save failed, unlock the buttons and tell the user
                    $scope.ui.saveStatus.job = -1;
                    $scope.saveLock = false;
                    msgs.error(
                      i18n.translate('xpack.ml.newJob.advanced.unsuccessfulSavingResultErrorMessage', {
                        defaultMessage: 'Save failed: {message}',
                        values: { message: result.resp.message }
                      })
                    );
                    $scope.$applyAsync();
                  }
                }).catch((result) => {
                  $scope.ui.saveStatus.job = -1;
                  $scope.saveLock = false;
                  msgs.error(
                    i18n.translate('xpack.ml.newJob.advanced.saveFailedWithMessageErrorMessage', {
                      defaultMessage: 'Save failed: {message}',
                      values: { message: result.resp.message }
                    })
                  );
                  $scope.$applyAsync();
                });
            }
          })
          .catch(() => {
            msgs.error(
              i18n.translate('xpack.ml.newJob.advanced.saveFailedErrorMessage', {
                defaultMessage: 'Save failed'
              })
            );
            console.log('save(): job validation failed. Jobs list could not be loaded.');
            $scope.$applyAsync();
          });
      }
      else {
        msgs.error(jobValid.message);
        console.log('save(): job validation failed');
        $scope.$applyAsync();
      }
    };

    $scope.cancel = function () {
      mlConfirm.open({
        message: i18n.translate('xpack.ml.newJob.advanced.cancelJobCreationConfirmModalDescription', {
          defaultMessage: 'Are you sure you want to cancel job creation?'
        }),
        title: i18n.translate('xpack.ml.newJob.advanced.cancelJobCreationConfirmModalTitle', {
          defaultMessage: 'Are you sure?'
        })
      })
        .then(() => {
          msgs.clear();
          $scope.$applyAsync();
          $location.path('jobs');
        });
    };

    // called after loading ES data when cloning a job
    $scope.cloneJobDataDescriptionCallback = function () {
      extractCustomInfluencers();
    };

    // if an index pattern or saved search has been added to the url
    // populate those items in the form and datafeed config
    function populateFormFromUrl() {
      const createSearchItems = Private(SearchItemsProvider);
      const {
        indexPattern,
        savedSearch,
        combinedQuery } = createSearchItems();

      if (indexPattern.id !== undefined) {
        timeBasedIndexCheck(indexPattern, true);
        $scope.ui.datafeed.indicesText = indexPattern.title;
        $scope.job.data_description.time_field = indexPattern.timeFieldName;

        if (savedSearch.id !== undefined) {
          $scope.ui.datafeed.queryText = JSON.stringify(combinedQuery);
        }
      }
    }

    $scope.timeFieldSelected = function () {
      return ($scope.job.data_description.time_field === '') ? false : true;
    };

    $scope.jsonTextChange = function () {
      try {
        // create the job from the json text.
        $scope.job = JSON.parse($scope.ui.jsonText);
        $scope.changeJobIDCase();

        // update the job groups ui component
        if ($scope.jobGroupsUpdateFunction.update !== undefined) {
          $scope.jobGroupsUpdateFunction.update($scope.job.groups);
        }

        // in case influencers have been added into the json. treat them as custom if unrecognised
        extractCustomInfluencers();

        setFieldDelimiterControlsFromText();
        setDatafeedUIText();
        setAnalysisLimitsUIText();

        // if results_index_name exists, tick the dedicated index checkbox
        if ($scope.job.results_index_name !== undefined) {
          $scope.ui.useDedicatedIndex = true;
        } else {
          $scope.ui.useDedicatedIndex = false;
        }
      } catch (e) {
        console.log('JSON could not be parsed');
      // a better warning should be used.
      // colour the json text area red and display a warning somewhere. possibly in the message bar.
      }
    };

    // force job ids to be lowercase
    $scope.changeJobIDCase = function () {
      if ($scope.job.job_id) {
        $scope.job.job_id = $scope.job.job_id.toLowerCase();
      }
    };

    // called when the datafeed tickbox is toggled.
    // creates or destroys the datafeed section in the config
    $scope.datafeedChange = function () {
      if ($scope.ui.isDatafeed) {
        $scope.job.datafeed_config = {};
        $scope.ui.tabs[2].hidden = true;
        calculateDatafeedFrequencyDefaultSeconds();
      } else {
        delete $scope.job.datafeed_config;
        $scope.ui.tabs[2].hidden = false;
        $scope.job.data_description.format = 'json';
      }

      showDataPreviewTab();
    };

    $scope.setDedicatedIndex = function () {
      if ($scope.ui.useDedicatedIndex) {
        $scope.job.results_index_name = '';
      } else {
        delete $scope.job.results_index_name;
      }
    };

    function runValidateCardinality() {
      const { STATUS } = $scope.ui.cardinalityValidator;
      $scope.ui.cardinalityValidator.status = $scope.ui.cardinalityValidator.STATUS.RUNNING;

      const tempJob = mlJobService.cloneJob($scope.job);
      _.merge(tempJob, getMinimalValidJob());

      ml.validateCardinality(tempJob)
        .then((response) => {
          const validationResult = checkCardinalitySuccess(response);

          if (validationResult.success === true) {
            $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
            $scope.ui.cardinalityValidator.message = '';
          } else {
            $scope.ui.cardinalityValidator.message = i18n.translate(
              'xpack.ml.newJob.advanced.recommendationForUsingModelPlotWithCardinalityDescription',
              {
                defaultMessage: 'Creating model plots is resource intensive and not recommended ' +
                  'where the cardinality of the selected fields is greater than 100. Estimated cardinality ' +
                  'for this job is {highCardinality}. ' +
                  'If you enable model plot with this configuration ' +
                  'we recommend you select a dedicated results index on the Job Details tab.',
                values: { highCardinality: validationResult.highCardinality }
              }
            );

            $scope.ui.cardinalityValidator.status = STATUS.WARNING;
          }
        })
        .catch((error) => {
          console.log('Cardinality check error:', error);
          $scope.ui.cardinalityValidator.message = i18n.translate(
            'xpack.ml.newJob.advanced.cardinalityNotValidErrorMessage',
            {
              defaultMessage: 'An error occurred validating the configuration ' +
                'for running the job with model plot enabled. ' +
                'Creating model plots can be resource intensive and not recommended ' +
                'where the cardinality of the selected fields is high. ' +
                'You may want to select a dedicated results index on the Job Details tab.'
            }
          );
          $scope.ui.cardinalityValidator.status = STATUS.FAILED;
        })
        .then(() => {
          $scope.$applyAsync();
        });
    }

    $scope.onDetectorsUpdate = function () {
      const { STATUS } = $scope.ui.cardinalityValidator;

      if ($scope.ui.enableModelPlot === true) {
        // Update currentConfigs since config changed
        currentConfigs.detectors = _.cloneDeep($scope.job.analysis_config.detectors);

        if ($scope.job.analysis_config.detectors.length === 0) {
          $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
          $scope.ui.cardinalityValidator.message = '';
        } else {
          runValidateCardinality();
        }
      }
    };

    $scope.setModelPlotEnabled = function () {
      const { STATUS } = $scope.ui.cardinalityValidator;

      if ($scope.ui.enableModelPlot === true) {
        // Start keeping track of the config in case of changes from Edit JSON tab requiring another cardinality check
        currentConfigs.detectors = _.cloneDeep($scope.job.analysis_config.detectors);

        $scope.job.model_plot_config = {
          enabled: true
        };

        currentConfigs.model_plot_config.enabled = true;
        // return early if there's nothing to run a check on yet.
        if ($scope.job.analysis_config.detectors.length === 0) {
          return;
        }

        runValidateCardinality();
      } else {
        currentConfigs.model_plot_config.enabled = false;
        $scope.ui.cardinalityValidator.status = STATUS.FINISHED;
        $scope.ui.cardinalityValidator.message = '';
        delete $scope.job.model_plot_config;
      }
    };

    // function called by field-select components to set
    // properties in the analysis_config
    $scope.setAnalysisConfigProperty = function (value, field) {
      if (value === '') {
      // remove the property from the job JSON
        delete $scope.job.analysis_config[field];
      } else {
        $scope.job.analysis_config[field] = value;
      }
    };


    function clear(obj) {
      Object.keys(obj).forEach(function (key) { delete obj[key]; });
      if (Array.isArray(obj)) {
        obj.length = 0;
      }
    }

    // triggered when the user changes the JSON text
    // reflect the changes in the UI
    function setDatafeedUIText() {
      if ($scope.job.datafeed_config && Object.keys($scope.job.datafeed_config).length) {
        const datafeedConfig = $scope.job.datafeed_config;

        $scope.ui.isDatafeed = true;
        $scope.ui.tabs[2].hidden = true;
        $scope.ui.dataLocation = 'ES';
        showDataPreviewTab();

        const queryDelayDefault = $scope.ui.datafeed.queryDelayDefault;
        let queryDelay = datafeedConfig.query_delay;
        if (datafeedConfig.query_delay === undefined || $scope.ui.datafeed.queryDelayDefault === datafeedConfig.query_delay) {
          queryDelay = '';
        }

        const frequencyDefault = $scope.ui.datafeed.frequencyDefault;
        let freq = datafeedConfig.frequency;
        if (datafeedConfig.frequency === undefined || $scope.ui.datafeed.frequencyDefault === datafeedConfig.frequency) {
          freq = '';
        }

        const scrollSizeDefault = $scope.ui.datafeed.scrollSizeDefault;
        let scrollSize = datafeedConfig.scroll_size;
        if (datafeedConfig.scroll_size === undefined || $scope.ui.datafeed.scrollSizeDefault === datafeedConfig.scroll_size) {
          scrollSize = '';
        }

        clear($scope.indices);
        _.each(datafeedConfig.indices, (index) => {
          $scope.indices[index] = $scope.ui.indices[index];
        });

        const indicesText = datafeedConfig.indices.join(',');

        const scriptFields = (datafeedConfig.script_fields !== undefined) ? Object.keys(datafeedConfig.script_fields) : [];

        let fieldsUpToDate = true;
        if (indicesText !== $scope.ui.datafeed.indicesText || _.isEqual(scriptFields, $scope.ui.datafeed.scriptFields) === false) {
          fieldsUpToDate = false;
        }

        $scope.ui.fieldsUpToDate = fieldsUpToDate;

        $scope.ui.datafeed = {
          queryText: angular.toJson(datafeedConfig.query, true),
          queryDelayText: queryDelay,
          queryDelayDefault: queryDelayDefault,
          frequencyText: freq,
          frequencyDefault: frequencyDefault,
          scrollSizeText: scrollSize,
          scrollSizeDefault: scrollSizeDefault,
          indicesText,
          scriptFields,
        };

        if ($scope.ui.fieldsUpToDate === false) {
          $scope.loadFields();
        }

      } else {
        $scope.ui.isDatafeed = false;
        $scope.ui.tabs[2].hidden = false;
      }
    }

    // set the analysis limits items, such as model memory limit
    function setAnalysisLimitsUIText() {
      if ($scope.job.analysis_limits !== undefined) {
        if ($scope.job.analysis_limits.model_memory_limit !== undefined) {
          $scope.ui.modelMemoryLimitText = $scope.job.analysis_limits.model_memory_limit;
        }
      }
    }

    // work out the default frequency based on the bucket_span
    function calculateDatafeedFrequencyDefaultSeconds() {
      const bucketSpan = parseInterval($scope.job.analysis_config.bucket_span);
      if (bucketSpan !== null) {
        $scope.ui.datafeed.frequencyDefault = juCalculateDatafeedFrequencyDefaultSeconds(bucketSpan.asSeconds()) + 's';
      }
    }

    // scope version of the above function
    $scope.calculateDatafeedFrequencyDefaultSeconds = calculateDatafeedFrequencyDefaultSeconds;


    function setFieldDelimiterControlsFromText() {
      if ($scope.job.data_description && $scope.job.data_description.field_delimiter) {

        // if the data format has not been set and fieldDelimiter exists,
        // assume the format is delimited
        if ($scope.job.data_description.format === undefined) {
          $scope.job.data_description.format = 'delimited';
        }

        const fieldDelimiter = $scope.job.data_description.field_delimiter;
        $scope.ui.selectedFieldDelimiter = 'custom';
        $scope.ui.customFieldDelimiter = '';
        let isCustom = true;
        for (let i = 0; i < $scope.ui.fieldDelimiterOptions.length - 1; i++) {
          if ($scope.ui.fieldDelimiterOptions[i].value === fieldDelimiter) {
            isCustom = false;
            $scope.ui.selectedFieldDelimiter = $scope.ui.fieldDelimiterOptions[i].value;
          }
        }
        if (isCustom) {
          $scope.ui.customFieldDelimiter = fieldDelimiter;
        }
      }
    }

    function getDelimiterSelection() {
      if ($scope.job.data_description.format === 'delimited') {
        const selectedFieldDelimiter = $scope.ui.selectedFieldDelimiter;
        if (selectedFieldDelimiter === 'custom') {
          $scope.job.data_description.field_delimiter = $scope.ui.customFieldDelimiter;
        }
        else {
          $scope.job.data_description.field_delimiter = selectedFieldDelimiter;
        }
      } else {
        delete $scope.job.data_description.field_delimiter;
        delete $scope.job.data_description.quote_character;
      }
    }

    // create the analysis limits section of the job
    // if there are no settings (e.g. model_memory_limit is not set) delete the
    // analysis_limits section entirely
    function getAnalysisLimitsSelection() {
      const ui = $scope.ui;
      const job = $scope.job;
      if (ui.modelMemoryLimitText === '' || ui.modelMemoryLimitText === null || ui.modelMemoryLimitText === undefined) {
        if (job.analysis_limits !== undefined) {
          delete job.analysis_limits.model_memory_limit;

          if (Object.keys(job.analysis_limits).length === 0) {
          // analysis_limits section is empty, so delete it
            delete job.analysis_limits;
          }
        }
      }
      else {
      // create the analysis_limits section if it doesn't already exist
        if (job.analysis_limits === undefined) {
          job.analysis_limits = {};
        }
        job.analysis_limits.model_memory_limit = ui.modelMemoryLimitText;
      }
    }

    // create the datafeedConfig section of the job config
    function getDatafeedSelection() {
      if ($scope.ui.isDatafeed) {
        const df = $scope.ui.datafeed;

        if (df.queryText === '') {
          df.queryText = '{"match_all":{}}';
        }
        let query = df.queryText;
        try {
          query = JSON.parse(query);
        } catch (e) {
          console.log('getDatafeedSelection(): could not parse query JSON');
        }

        let indices = [];
        if (df.indicesText) {
          indices = df.indicesText.split(',').map(i => i.trim());
        }

        // create datafeedConfig if it doesn't already exist
        if (!$scope.job.datafeed_config) {
          $scope.job.datafeed_config = {};
        }

        const config = $scope.job.datafeed_config;

        config.query = query;

        if (df.queryDelayText === '' || df.queryDelayText === null || df.queryDelayText === undefined) {
          delete config.query_delay;
        }
        else {
          config.query_delay = df.queryDelayText;
        }

        if (df.frequencyText === '' || df.frequencyText === null || df.frequencyText === undefined) {
          delete config.frequency;
        }
        else {
          config.frequency = df.frequencyText;
        }

        if (df.scrollSizeText === '' || df.scrollSizeText === null || df.scrollSizeText === undefined) {
          delete config.scroll_size;
        }
        else {
          config.scroll_size = df.scrollSizeText;
        }

        config.indices = indices;
      }
    }

    function getCustomUrlSelection() {
    // if no custom urls have been created, delete the whole custom settings item
      if ($scope.job.custom_settings && $scope.job.custom_settings.custom_urls) {
        if ($scope.job.custom_settings.custom_urls.length === 0) {
          delete $scope.job.custom_settings;
        }
      }
    }

    function getCategorizationFilterSelection() {
    // if no filters have been created, delete the filter array
      if ($scope.job.analysis_config && $scope.job.analysis_config.categorization_filters) {
        if ($scope.job.analysis_config.categorization_filters.length === 0) {
          delete $scope.job.analysis_config.categorization_filters;
        }
      }
    }

    function createJSONText() {
      getDelimiterSelection();
      getAnalysisLimitsSelection();
      getDatafeedSelection();
      getCustomUrlSelection();
      getCategorizationFilterSelection();
      $scope.ui.jsonText = angular.toJson($scope.job, true);
      setTimeout(() => {
        $scope.$applyAsync();
      }, 0);
    }

    // add new custom URL
    $scope.addCustomUrl = function () {
      if (!$scope.job.custom_settings) {
        $scope.job.custom_settings = {};
      }
      if (!$scope.job.custom_settings.custom_urls) {
        $scope.job.custom_settings.custom_urls = [];
      }

      $scope.job.custom_settings.custom_urls.push({ url_name: '', url_value: '' });
    };

    // remove selected custom URL
    $scope.removeCustomUrl = function (index) {
      $scope.job.custom_settings.custom_urls.splice(index, 1);
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


    $scope.influencerChecked = function (inf) {
      return (_.contains($scope.job.analysis_config.influencers, inf));
    };

    $scope.toggleInfluencer = function (inf) {
      const influencers = $scope.job.analysis_config.influencers;
      if ($scope.influencerChecked(inf)) {
        for (let i = 0; i < influencers.length; i++) {
          if (influencers[i] === inf) {
            $scope.job.analysis_config.influencers.splice(i, 1);
          }
        }
      } else {
        $scope.job.analysis_config.influencers.push(inf);
      }
    };

    $scope.addCustomInfluencer = function () {
      if ($scope.ui.tempCustomInfluencer !== '') {
        $scope.ui.customInfluencers.push($scope.ui.tempCustomInfluencer);
        $scope.ui.tempCustomInfluencer = '';
      }
    };

    // look at the difference between loaded ES influencers and the ones in the current job.
    // unrecognised influencers must have been added by the user.
    function extractCustomInfluencers() {
      const allInfluencersList = $scope.ui.influencers;
      $scope.ui.customInfluencers = _.difference($scope.job.analysis_config.influencers, allInfluencersList);
      console.log('extractCustomInfluencers: ', $scope.ui.customInfluencers);
    }

    // function used to check that all required fields are filled in
    function validateJob() {
      const limits = newJobLimits();
      const validationResults = basicJobValidation($scope.job, $scope.fields, limits);

      const valid = validationResults.valid;
      const message = i18n.translate('xpack.ml.newJob.advanced.fillInAllrequiredFieldsValidationMessage', {
        defaultMessage: 'Fill in all required fields'
      });

      const tabs = $scope.ui.validation.tabs;
      // reset validations
      _.each(tabs, function (tab) {
        tab.valid = true;
        for (const check in tab.checks) {
          if (tab.checks.hasOwnProperty(check)) {
            tab.checks[check].valid = true;
            tab.checks[check].message = '';
          }
        }
      });

      const job = $scope.job;
      if (job) {
        // tab 0 - Job Details
        // job already exists check happens in save function
        // as users may wish to continue and overwrite existing job
        if (validationResults.contains('job_id_empty')) {
          tabs[0].checks.jobId.valid = false;
        } else if (validationResults.contains('job_id_invalid')) {
          tabs[0].checks.jobId.valid = false;
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.jobNameAllowedCharactersDescription', {
            defaultMessage: 'Job name can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
            'must start and end with an alphanumeric character'
          });
          tabs[0].checks.jobId.message = msg;
        }

        if (validationResults.contains('job_group_id_invalid')) {
          tabs[0].checks.groupIds.valid = false;
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.jobGroupNamesAllowedCharactersDescription', {
            defaultMessage: 'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
            'must start and end with an alphanumeric character'
          });
          tabs[0].checks.groupIds.message = msg;
        }

        if (validationResults.contains('model_memory_limit_units_invalid')) {
          tabs[0].checks.modelMemoryLimit.valid = false;
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.modelMemoryLimitUnrecognizedUnitsErrorMessage', {
            defaultMessage: 'Model memory limit data unit unrecognized. It must be {allowedDataUnits} or {allowedDataUnit}',
            values: {
              allowedDataUnits: (ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(', ')),
              allowedDataUnit: ([...ALLOWED_DATA_UNITS].pop())
            }
          });
          tabs[0].checks.modelMemoryLimit.message = msg;
        }

        if (validationResults.contains('model_memory_limit_invalid')) {
          tabs[0].checks.modelMemoryLimit.valid = false;
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.modelMemoryLimitInvalidRangeErrorMessage', {
            defaultMessage: 'Model memory limit cannot be higher than the maximum value of {maxModelMemoryLimit}',
            values: { maxModelMemoryLimit: limits.max_model_memory_limit.toUpperCase() }
          });
          tabs[0].checks.modelMemoryLimit.message = msg;
        }

        // tab 1 - Analysis Configuration
        if (validationResults.contains('categorization_filter_invalid')) {
          tabs[1].checks.categorizationFilters.message = i18n.translate(
            'xpack.ml.newJob.advanced.validateJob.howToAllowFiltersDescription', {
              defaultMessage: '{categorizationFieldName} must be set to allow filters',
              values: { categorizationFieldName: 'categorizationFieldName' }
            });
          tabs[1].checks.categorizationFilters.valid = false;
        }

        if (validationResults.contains('detectors_empty')) {
          tabs[1].checks.detectors.valid = false;
        }
        if (validationResults.contains('detectors_duplicates')) {
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.duplicateDetectorsFoundErrorMessage', {
            defaultMessage: 'Duplicate detectors were found. Detectors having the same combined configuration for ' +
            `'{function}', '{fieldName}', '{byFieldName}', '{overFieldName}' and '{partitionFieldName}' ` +
            'are not allowed within the same job.',
            values: {
              function: 'function',
              fieldName: 'field_name',
              byFieldName: 'by_field_name',
              overFieldName: 'over_field_name',
              partitionFieldName: 'partition_field_name'
            }
          });
          tabs[1].checks.detectors.message = msg;
          tabs[1].checks.detectors.valid = false;
        }

        if (validationResults.contains('influencers_empty')) {
        // tabs[1].checks.influencers.valid = false;
        }

        if (validationResults.contains('bucket_span_empty')) {
          tabs[1].checks.bucketSpan.message = i18n.translate('xpack.ml.newJob.advanced.validateJob.bucketSpanMustBeSetErrorMessage', {
            defaultMessage: '{bucketSpan} must be set',
            values: { bucketSpan: 'bucket_span' }
          });
          tabs[1].checks.bucketSpan.valid = false;
        } else if (validationResults.contains('bucket_span_invalid')) {
          const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.bucketSpanInvalidTimeIntervalFormatErrorMessage', {
            defaultMessage:
              '{bucketSpan} is not a valid time interval format e.g. {tenMinutes}, {oneHour}. It also needs to be higher than zero.',
            values: { bucketSpan: job.analysis_config.bucket_span, tenMinutes: '10m', oneHour: '1h' }
          });
          tabs[1].checks.bucketSpan.message = msg;
          tabs[1].checks.bucketSpan.valid = false;
        }

        // tab 3 - Datafeed
        validateIndex(tabs, () => validationResults.contains('index_fields_invalid'));

      }

      // for each tab, set its validity based on its contained checks
      _.each(tabs, function (tab) {
        _.each(tab.checks, function (item) {
          if (item.valid === false) {
          // set tab valid state to false
            tab.valid = false;
          }
        });
      });

      return {
        valid,
        message
      };
    }

    // the dataFeedTest argument is a function with the default test used by the directive.
    // it can be overridden with a custom function to do an alternative test
    function validateIndex(tabs, dataFeedTest = () => (Object.keys($scope.fields).length === 0)) {
      if (dataFeedTest()) {
        const msg = i18n.translate('xpack.ml.newJob.advanced.validateJob.couldNotLoadFieldsFromIndexErrorMessage', {
          defaultMessage: 'Could not load fields from index'
        });
        tabs[3].checks.hasAccessToIndex.valid = false;
        tabs[3].checks.hasAccessToIndex.message = msg;
        tabs[3].valid = false;
      } else {
        tabs[3].checks.hasAccessToIndex.valid = true;
        tabs[3].valid = true;
      }
    }

    function openSaveStatusWindow() {
      $modal.open({
        template: saveStatusTemplate,
        controller: 'MlSaveStatusModal',
        backdrop: 'static',
        keyboard: false,
        size: 'sm',
        resolve: {
          params: function () {
            return {
              pscope: $scope,
              openDatafeed: function () {
                mlJobService.currentJob = $scope.job;
              }
            };
          }
        }
      });
    }

    // using the selected indices, perform a search
    // on the ES server and display the results in the Data preview tab
    function loadDataPreview() {
      createJSONText();
      $scope.ui.dataPreview = '';

      const job = $scope.job;

      if (job.datafeed_config && job.datafeed_config.indices.length) {
        mlJobService.searchPreview(job)
          .then(function (resp) {
            let data;

            if (resp.aggregations) {
              data = resp.aggregations.buckets.buckets.slice(0, ML_DATA_PREVIEW_COUNT);
            } else {
              data = resp.hits.hits;
            }

            $scope.ui.dataPreview = angular.toJson(data, true);
          })
          .catch(function (resp) {
            $scope.ui.dataPreview = angular.toJson(resp, true);
          })
          .then(() => {
            $scope.$applyAsync();
          });
      } else {
        $scope.ui.dataPreview = i18n.translate('xpack.ml.newJob.advanced.dataPreview.datafeedDoesNotExistLabel', {
          defaultMessage: 'Datafeed does not exist'
        });
        $scope.$applyAsync();
      }
    }

    function showDataPreviewTab() {
      let hidden = true;
      // if this is a datafeed job, make the Data Preview tab available
      if ($scope.ui.isDatafeed) {
        hidden = false;
      }

      // however, if cloning a datafeedless, don't display the preview tab
      if ($scope.ui.dataLocation === 'NONE' && $scope.mode === MODE.CLONE) {
        hidden = true;
      }

      $scope.ui.tabs[5].hidden = hidden;
      $scope.$applyAsync();
    }

    // combine all influencers into a sorted array
    function allInfluencers() {
      let influencers = $scope.ui.influencers.concat($scope.ui.customInfluencers);
      // deduplicate to play well with ng-repeat
      influencers = _.uniq(influencers);

      return _.sortBy(influencers, (inf) => inf);
    }

    $scope.aceLoaded = function (editor) {
      $scope.$applyAsync();
      if (editor.container.id === 'datafeed-preview') {
        editor.setReadOnly(true);
      }
    };

    init();

  });
