/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { FC } from 'react';
import { isEqual, cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DeepReadonly } from '../../../../../../../common/types/common';
import { DataFrameAnalyticsConfig, isOutlierAnalysis } from '../../../../common';
import { isClassificationAnalysis, isRegressionAnalysis } from '../../../../common/analytics';
import { DEFAULT_RESULTS_FIELD } from '../../../../common/constants';
import {
  CreateAnalyticsFormProps,
  DEFAULT_NUM_TOP_FEATURE_IMPORTANCE_VALUES,
} from '../../hooks/use_create_analytics_form';
import { State } from '../../hooks/use_create_analytics_form/state';
import { DataFrameAnalyticsListRow } from './common';
import { checkPermission } from '../../../../../capabilities/check_capabilities';

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
            },
            feature_bag_fraction: {
              optional: true,
            },
            max_trees: {
              optional: true,
            },
            gamma: {
              optional: true,
            },
            lambda: {
              optional: true,
            },
            num_top_classes: {
              optional: true,
              defaultValue: 2,
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis.classification.dependent_variable}_prediction`,
            },
            randomize_seed: {
              optional: true,
              // By default it is randomly generated
              ignore: true,
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
            },
            compute_feature_influence: {
              defaultValue: true,
              optional: true,
            },
            outlier_fraction: {
              defaultValue: 0.05,
              optional: true,
            },
            feature_influence_threshold: {
              optional: true,
            },
            method: {
              optional: true,
            },
            n_neighbors: {
              optional: true,
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
            },
            feature_bag_fraction: {
              optional: true,
            },
            max_trees: {
              optional: true,
            },
            gamma: {
              optional: true,
            },
            lambda: {
              optional: true,
            },
            prediction_field_name: {
              optional: true,
              defaultValue: `${config.analysis.regression.dependent_variable}_prediction`,
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
            },
          },
        }
      : {}),
  },
  analyzed_fields: {
    excludes: {
      optional: true,
      formKey: 'excludes',
      defaultValue: [],
    },
    includes: {
      optional: true,
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

interface CloneActionProps {
  item: DeepReadonly<DataFrameAnalyticsListRow>;
  createAnalyticsForm: CreateAnalyticsFormProps;
}

/**
 * Temp component to have Clone job button with the same look as the other actions.
 * Replace with {@link getCloneAction} as soon as all the actions are refactored
 * to support EuiContext with a valid DOM structure without nested buttons.
 */
export const CloneAction: FC<CloneActionProps> = ({ createAnalyticsForm, item }) => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');

  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });
  const { actions } = createAnalyticsForm;
  const onClick = async () => {
    await actions.setJobClone(item.config);
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
