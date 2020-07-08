/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { FC } from 'react';
import { isEqual, cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { IIndexPattern } from 'src/plugins/data/common';
import { DeepReadonly } from '../../../../../../../common/types/common';
import { DataFrameAnalyticsConfig, isOutlierAnalysis } from '../../../../common';
import { isClassificationAnalysis, isRegressionAnalysis } from '../../../../common/analytics';
import { DEFAULT_RESULTS_FIELD } from '../../../../common/constants';
import { useMlKibana } from '../../../../../contexts/kibana';
import {
  CreateAnalyticsFormProps,
  DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
} from '../../hooks/use_create_analytics_form';
import { State } from '../../hooks/use_create_analytics_form/state';
import { DataFrameAnalyticsListRow } from '../analytics_list/common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';
import { extractErrorMessage } from '../../../../../../../common/util/errors';

interface PropDefinition {
  /**
   * Indicates if the property is optional
   */
  optional: boolean;
  /**
   * Corresponding property from the form
   */
  formKey?: keyof State['form'];
  /**
   * Default value of the property
   */
  defaultValue?: any;
  /**
   * Indicates if the value has to be ignored
   * during detecting advanced configuration
   */
  ignore?: boolean;
}

function isPropDefinition(a: PropDefinition | object): a is PropDefinition {
  return a.hasOwnProperty('optional');
}

interface AnalyticsJobMetaData {
  [key: string]: PropDefinition | AnalyticsJobMetaData;
}

/**
 * Provides a config definition.
 */
const getAnalyticsJobMeta = (config: CloneDataFrameAnalyticsConfig): AnalyticsJobMetaData => ({
  allow_lazy_start: {
    optional: true,
    defaultValue: false,
  },
  description: {
    optional: true,
    formKey: 'description',
  },
  analysis: {
    ...(isClassificationAnalysis(config.analysis)
      ? {
          classification: {
            dependent_variable: {
              optional: false,
              formKey: 'dependentVariable',
            },
            training_percent: {
              optional: true,
              formKey: 'trainingPercent',
            },
            eta: {
              optional: true,
              formKey: 'eta',
            },
            feature_bag_fraction: {
              optional: true,
              formKey: 'featureBagFraction',
            },
            max_trees: {
              optional: true,
              formKey: 'maxTrees',
            },
            gamma: {
              optional: true,
              formKey: 'gamma',
            },
            lambda: {
              optional: true,
              formKey: 'lambda',
            },
            num_top_classes: {
              optional: true,
              defaultValue: 2,
              formKey: 'numTopClasses',
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis.classification.dependent_variable}_prediction`,
              formKey: 'predictionFieldName',
            },
            randomize_seed: {
              optional: true,
              // By default it is randomly generated
              ignore: true,
              formKey: 'randomizeSeed',
            },
            num_top_feature_importance_values: {
              optional: true,
              defaultValue: DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
              formKey: 'numTopFeatureImportanceValues',
            },
            class_assignment_objective: {
              optional: true,
              defaultValue: 'maximize_minimum_recall',
            },
          },
        }
      : {}),
    ...(isOutlierAnalysis(config.analysis)
      ? {
          outlier_detection: {
            standardization_enabled: {
              defaultValue: true,
              optional: true,
              formKey: 'standardizationEnabled',
            },
            compute_feature_influence: {
              defaultValue: true,
              optional: true,
              formKey: 'computeFeatureInfluence',
            },
            outlier_fraction: {
              defaultValue: 0.05,
              optional: true,
              formKey: 'outlierFraction',
            },
            feature_influence_threshold: {
              optional: true,
              formKey: 'featureInfluenceThreshold',
            },
            method: {
              optional: true,
              formKey: 'method',
            },
            n_neighbors: {
              optional: true,
              formKey: 'nNeighbors',
            },
          },
        }
      : {}),
    ...(isRegressionAnalysis(config.analysis)
      ? {
          regression: {
            dependent_variable: {
              optional: false,
              formKey: 'dependentVariable',
            },
            training_percent: {
              optional: true,
              formKey: 'trainingPercent',
            },
            eta: {
              optional: true,
              formKey: 'eta',
            },
            feature_bag_fraction: {
              optional: true,
              formKey: 'featureBagFraction',
            },
            max_trees: {
              optional: true,
              formKey: 'maxTrees',
            },
            gamma: {
              optional: true,
              formKey: 'gamma',
            },
            lambda: {
              optional: true,
              formKey: 'lambda',
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis.regression.dependent_variable}_prediction`,
              formKey: 'predictionFieldName',
            },
            num_top_feature_importance_values: {
              optional: true,
              defaultValue: DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
              formKey: 'numTopFeatureImportanceValues',
            },
            randomize_seed: {
              optional: true,
              // By default it is randomly generated
              ignore: true,
              formKey: 'randomizeSeed',
            },
            loss_function: {
              optional: true,
              defaultValue: 'mse',
            },
            loss_function_parameter: {
              optional: true,
            },
          },
        }
      : {}),
  },
  analyzed_fields: {
    excludes: {
      optional: true,
      defaultValue: [],
    },
    includes: {
      optional: true,
      formKey: 'includes',
      defaultValue: [],
    },
  },
  source: {
    index: {
      formKey: 'sourceIndex',
      optional: false,
    },
    query: {
      optional: true,
      defaultValue: {
        match_all: {},
      },
    },
    _source: {
      optional: true,
    },
  },
  dest: {
    index: {
      optional: false,
      formKey: 'destinationIndex',
    },
    results_field: {
      optional: true,
      formKey: 'resultsField',
      defaultValue: DEFAULT_RESULTS_FIELD,
    },
  },
  model_memory_limit: {
    optional: true,
    formKey: 'modelMemoryLimit',
  },
});

/**
 * Detects if analytics job configuration were created with
 * the advanced editor and not supported by the regular form.
 */
export function isAdvancedConfig(config: any, meta?: AnalyticsJobMetaData): boolean;
export function isAdvancedConfig(
  config: CloneDataFrameAnalyticsConfig,
  meta: AnalyticsJobMetaData = getAnalyticsJobMeta(config)
): boolean {
  for (const configKey in config) {
    if (config.hasOwnProperty(configKey)) {
      const fieldConfig = config[configKey as keyof typeof config];
      const fieldMeta = meta[configKey as keyof typeof meta];

      if (!fieldMeta) {
        // eslint-disable-next-line no-console
        console.info(`Property "${configKey}" is unknown.`);
        return true;
      }

      if (isPropDefinition(fieldMeta)) {
        const isAdvancedSetting =
          fieldMeta.formKey === undefined &&
          fieldMeta.ignore !== true &&
          !isEqual(fieldMeta.defaultValue, fieldConfig);

        if (isAdvancedSetting) {
          // eslint-disable-next-line no-console
          console.info(
            `Property "${configKey}" is not supported by the form or has a different value to the default.`
          );
          return true;
        }
      } else if (isAdvancedConfig(fieldConfig, fieldMeta)) {
        return true;
      }
    }
  }
  return false;
}

export type CloneDataFrameAnalyticsConfig = Omit<
  DataFrameAnalyticsConfig,
  'id' | 'version' | 'create_time'
>;

/**
 * Gets complete original configuration as an input
 * and returns the config for cloning omitting
 * non-relevant parameters and resetting the destination index.
 */
export function extractCloningConfig({
  id,
  version,
  create_time,
  ...configToClone
}: DeepReadonly<DataFrameAnalyticsConfig>): CloneDataFrameAnalyticsConfig {
  return (cloneDeep({
    ...configToClone,
    dest: {
      ...configToClone.dest,
      // Reset the destination index
      index: '',
    },
  }) as unknown) as CloneDataFrameAnalyticsConfig;
}

export function getCloneAction(createAnalyticsForm: CreateAnalyticsFormProps) {
  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });

  const { actions } = createAnalyticsForm;

  const onClick = async (item: DeepReadonly<DataFrameAnalyticsListRow>) => {
    await actions.setJobClone(item.config);
  };

  return {
    name: buttonText,
    description: buttonText,
    icon: 'copy',
    onClick,
    'data-test-subj': 'mlAnalyticsJobCloneButton',
  };
}

interface CloneButtonProps {
  item: DataFrameAnalyticsListRow;
  createAnalyticsForm: CreateAnalyticsFormProps;
}

/**
 * Temp component to have Clone job button with the same look as the other actions.
 * Replace with {@link getCloneAction} as soon as all the actions are refactored
 * to support EuiContext with a valid DOM structure without nested buttons.
 */
export const CloneButton: FC<CloneButtonProps> = ({ createAnalyticsForm, item }) => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');

  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });

  const {
    services: {
      application: { navigateToUrl },
      notifications: { toasts },
      savedObjects,
    },
  } = useMlKibana();

  const savedObjectsClient = savedObjects.client;

  const onClick = async () => {
    const sourceIndex = Array.isArray(item.config.source.index)
      ? item.config.source.index[0]
      : item.config.source.index;
    let sourceIndexId;

    try {
      const response = await savedObjectsClient.find<IIndexPattern>({
        type: 'index-pattern',
        perPage: 10,
        search: `"${sourceIndex}"`,
        searchFields: ['title'],
        fields: ['title'],
      });

      const ip = response.savedObjects.find(
        (obj) => obj.attributes.title.toLowerCase() === sourceIndex.toLowerCase()
      );
      if (ip !== undefined) {
        sourceIndexId = ip.id;
      }
    } catch (e) {
      const error = extractErrorMessage(e);

      toasts.addDanger(
        i18n.translate(
          'xpack.ml.dataframe.analyticsList.fetchSourceIndexPatternForCloneErrorMessage',
          {
            defaultMessage:
              'An error occurred checking if index pattern {indexPattern} exists: {error}',
            values: { indexPattern: sourceIndex, error },
          }
        )
      );
    }

    if (sourceIndexId) {
      await navigateToUrl(
        `ml#/data_frame_analytics/new_job?index=${encodeURIComponent(sourceIndexId)}&jobId=${
          item.config.id
        }`
      );
    }
  };

  return (
    <EuiButtonEmpty
      data-test-subj="mlAnalyticsJobCloneButton"
      size="xs"
      color="text"
      iconType="copy"
      onClick={onClick}
      aria-label={buttonText}
      disabled={canCreateDataFrameAnalytics === false}
    >
      {buttonText}
    </EuiButtonEmpty>
  );
};
