/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import $ from 'jquery';

export function populateAppStateSettings(appState, scope) {
  if (appState.mlJobSettings !== undefined && Object.keys(appState.mlJobSettings).length) {
    const jobSettings = appState.mlJobSettings;

    (function () {
      if (scope.formConfig.hasOwnProperty('field')) {
        // single metric configuration
        return populateSingleMetricSettings(jobSettings, scope);
      } else if (scope.formConfig.hasOwnProperty('overField')) {
        // population configuration
        return populatePopulationSettings(jobSettings, scope);
      } else if (scope.formConfig.hasOwnProperty('fields')) {
        // multi metric configuration
        return populateMultiMetricSettings(jobSettings, scope);
      }
    }())
      .then(() => finish(true))
      .catch(() => finish(false));

    function finish(success) {
      if (success) {
        if (scope.bucketSpanEstimatorExportedFunctions.guessBucketSpan &&
          typeof scope.bucketSpanEstimatorExportedFunctions.guessBucketSpan === 'function') {
          scope.bucketSpanEstimatorExportedFunctions.guessBucketSpan();
        }
        $('#job-id-input').focus();
      }
    }
  }
}

// single metric page
function populateSingleMetricSettings(jobSettings, scope) {
  return new Promise((resolve, reject) => {
    jobSettings.fields.forEach(f => {

      if (f.agg !== undefined) {
        // find the aggregation object in the aggTypeOptions list which has the same name
        // as the agg setting in the url
        const agg = scope.ui.aggTypeOptions.find(o => (o.name === f.agg));
        if (agg !== undefined) {
          scope.formConfig.agg.type = agg;
          scope.aggChange();
        }
      }
      if (f.fieldName !== undefined) {
        const field = scope.ui.fields.find(o => (o.name === f.fieldName));
        // always set the field
        // a field has been set in the url, but it has not been found. so we should set
        // the selected field to be undefined to show this.
        // otherwise it will remain unchanged and it may have already been set by default
        // if there is only one in the dropdown list.
        scope.formConfig.field = field || null;
      }
    });

    if ((scope.formConfig.agg.type !== undefined && scope.formConfig.field !== undefined) ||
      (scope.formConfig.agg.type.name === 'count' && scope.formConfig.field === undefined)) {
      scope.loadVis();
      resolve();
    } else {
      reject();
    }
  });
}

// multi metric page
function populateMultiMetricSettings(jobSettings, scope) {
  return new Promise((resolve, reject) => {
    jobSettings.fields.forEach(f => {

      if (f.fieldName !== undefined) {
        const field = scope.ui.fields.find(o => (o.id === f.fieldName));
        if (field !== undefined) {
          scope.formConfig.fields[field.id] = field;
        }

        if (f.agg !== undefined) {
          const agg = scope.ui.aggTypeOptions.find(o => (o.name === f.agg));
          if (agg !== undefined) {
            scope.formConfig.fields[field.id].agg.type = agg;
          }
        }
      }
    });

    if (jobSettings.split !== undefined) {
      const field = scope.ui.splitFields.find(o => (o.name === jobSettings.split));
      if (field !== undefined) {
        scope.formConfig.splitField = field;
        scope.splitChange();
      }
    }

    if (scope.formConfig.fields !== undefined && (Object.keys(scope.formConfig.fields).length > 0)) {
      scope.loadVis();
      resolve();
    } else {
      reject();
    }
  });
}

// population page
function populatePopulationSettings(jobSettings, scope) {
  return new Promise((resolve, reject) => {
    if (jobSettings.population !== undefined) {
      const overField = scope.ui.overFields.find(o => (o.name === jobSettings.population));
      if (overField !== undefined) {
        scope.formConfig.overField = overField;
        scope.overChange();
      }

      jobSettings.fields.forEach(f => {

        if (f.fieldName !== undefined) {
          const tempField = scope.ui.fields.find(o => (o.id === f.fieldName));
          const field = { ...tempField };
          if (field !== undefined) {

            if (f.agg !== undefined) {
              const agg = scope.ui.aggTypeOptions.find(o => (o.name === f.agg));
              if (agg !== undefined) {
                field.agg = { type: agg };
              }
            }
            scope.formConfig.fields.push(field);
          }
        }
      });

      scope.formChange();

      // loop over each field and draw the split cards if necessary.
      // note, makes use of splitChange's returned promise so not to
      // fire off too many requests at once and not to attempt to draw
      // the card animations all at once
      function loop(i) {
        const f = jobSettings.fields[i];
        if (f.split !== undefined) {
          const splitField = scope.ui.splitFields.find(o => (o.name === f.split));
          if (splitField !== undefined) {
            scope.splitChange(i, splitField)
              .then(() => {
                check(i);
              });
          } else {
            check(i);
          }
        } else {
          // no split, move to the next field
          check(i);
        }
      }
      function check(i) {
        if ((i + 1) < jobSettings.fields.length) {
          loop(i + 1);
        }
      }
      loop(0);

    }
    if (scope.formConfig.fields !== undefined && (Object.keys(scope.formConfig.fields).length > 0)) {
      resolve();
    } else {
      reject();
    }
  });
}


