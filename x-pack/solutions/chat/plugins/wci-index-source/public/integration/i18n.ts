/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const translations = {
  indexSourceConfiguration: {
    title: i18n.translate('wciIndexSource.configuration.title', {
      defaultMessage: 'Index Source Configuration',
    }),
    description: i18n.translate('wciIndexSource.configuration.description', {
      defaultMessage: 'Configure the index source details',
    }),
    index: {
      label: i18n.translate('wciIndexSource.configuration.index.label', {
        defaultMessage: 'Index',
      }),
      placeholder: i18n.translate('wciIndexSource.configuration.index.placeholder', {
        defaultMessage: 'Select an index',
      }),
      generateConfig: i18n.translate('wciIndexSource.configuration.index.generateConfig', {
        defaultMessage: 'Generate configuration',
      }),
    },
    toolDescription: {
      label: i18n.translate('wciIndexSource.configuration.toolDescription.label', {
        defaultMessage: 'Tool Description',
      }),
      placeholder: i18n.translate('wciIndexSource.configuration.toolDescription.placeholder', {
        defaultMessage: 'Enter description',
      }),
    },
    queryTemplate: {
      label: i18n.translate('wciIndexSource.configuration.queryTemplate.label', {
        defaultMessage: 'Query Template',
      }),
      placeholder: i18n.translate('wciIndexSource.configuration.queryTemplate.placeholder', {
        defaultMessage: 'Enter Elasticsearch query template',
      }),
    },
    filterFields: {
      title: i18n.translate('wciIndexSource.configuration.filterFields.title', {
        defaultMessage: 'Filter Fields',
      }),
      description: i18n.translate('wciIndexSource.configuration.filterFields.description', {
        defaultMessage: 'Fields that can be used for filtering documents',
      }),
      noFields: {
        title: i18n.translate('wciIndexSource.configuration.filterFields.noFields.title', {
          defaultMessage: 'No filter fields defined',
        }),
        description: i18n.translate(
          'wciIndexSource.configuration.filterFields.noFields.description',
          {
            defaultMessage: 'No filter fields have been defined for this index source',
          }
        ),
      },
      fieldName: i18n.translate('wciIndexSource.configuration.filterFields.fieldName.label', {
        defaultMessage: 'Field name',
      }),
      fieldType: {
        label: i18n.translate('wciIndexSource.configuration.filterFields.fieldType.label', {
          defaultMessage: 'Field type',
        }),
      },
      getValues: {
        label: i18n.translate('wciIndexSource.configuration.filterFields.getValues.label', {
          defaultMessage: 'Get values',
        }),
      },
      fieldDescription: {
        label: i18n.translate('wciIndexSource.configuration.filterFields.description.label', {
          defaultMessage: 'Description',
        }),
        placeholder: i18n.translate(
          'wciIndexSource.configuration.filterFields.description.placeholder',
          {
            defaultMessage: 'Field description',
          }
        ),
      },
      addField: i18n.translate('wciIndexSource.configuration.filterFields.addField', {
        defaultMessage: 'Add filter field',
      }),
    },
    contextFields: {
      title: i18n.translate('wciIndexSource.configuration.contextFields.title', {
        defaultMessage: 'Context Fields',
      }),
      description: i18n.translate('wciIndexSource.configuration.contextFields.description', {
        defaultMessage: 'Fields that will be included in the context of the search results',
      }),
      noFields: {
        title: i18n.translate('wciIndexSource.configuration.contextFields.noFields.title', {
          defaultMessage: 'No context fields defined',
        }),
        description: i18n.translate(
          'wciIndexSource.configuration.contextFields.noFields.description',
          {
            defaultMessage: 'No context fields have been defined for this index source',
          }
        ),
      },
      fieldName: i18n.translate('wciIndexSource.configuration.contextFields.fieldName.label', {
        defaultMessage: 'Field name',
      }),
      semantic: {
        label: i18n.translate('wciIndexSource.configuration.contextFields.semantic.label', {
          defaultMessage: 'Semantic',
        }),
      },
      addField: i18n.translate('wciIndexSource.configuration.contextFields.addField', {
        defaultMessage: 'Add context field',
      }),
    },
  },
};
