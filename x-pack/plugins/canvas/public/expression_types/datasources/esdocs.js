/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSelect, EuiFieldText, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getSimpleArg, setSimpleArg } from '../../lib/arg_helpers';
import { ESFieldsSelect } from '../../components/es_fields_select';
import { ESFieldSelect } from '../../components/es_field_select';
import { ESIndexSelect } from '../../components/es_index_select';
import { templateFromReactComponent } from '../../lib/template_from_react_component';

const EsdocsDatasource = ({ args, updateArgs }) => {
  const setArg = (name, value) => {
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  const getArgName = () => {
    if (getSimpleArg('_', args)[0]) return '_';
    if (getSimpleArg('q', args)[0]) return 'q';
    return 'query';
  };

  const getIndex = () => {
    return getSimpleArg('index', args)[0] || '';
  };

  const getQuery = () => {
    return getSimpleArg(getArgName(), args)[0] || '';
  };

  const getFields = () => {
    const commas = getSimpleArg('fields', args)[0] || '';
    if (commas.length === 0) return [];
    return commas.split(',').map(str => str.trim());
  };

  const getSortBy = () => {
    const commas = getSimpleArg('sort', args)[0] || ', DESC';
    return commas.split(',').map(str => str.trim());
  };

  const fields = getFields();
  const [sortField, sortOrder] = getSortBy();

  const index = getIndex().toLowerCase();

  const sortOptions = [{ value: 'asc', text: 'Ascending' }, { value: 'desc', text: 'Descending' }];

  return (
    <div>
      <EuiCallOut size="s" title="Be careful" color="warning">
        <p>
          The Elasticsearch Docs datasource is used to pull documents directly from Elasticsearch
          without the use of aggregations. It is best used with low volume datasets and in
          situations where you need to view raw documents or plot exact, non-aggregated values on a
          chart.
        </p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      <EuiFormRow label="Index" helpText="Enter an index name or select an index pattern">
        <ESIndexSelect value={index} onChange={index => setArg('index', index)} />
      </EuiFormRow>

      <EuiFormRow label="Query" helpText="Lucene query string syntax" compressed>
        <EuiFieldText value={getQuery()} onChange={e => setArg(getArgName(), e.target.value)} />
      </EuiFormRow>
      <EuiFormRow label="Sort Field" helpText="Document sort field">
        <ESFieldSelect
          index={index}
          value={sortField}
          onChange={field => setArg('sort', [field, sortOrder].join(', '))}
        />
      </EuiFormRow>
      <EuiFormRow label="Sort Order" helpText="Document sort order" compressed>
        <EuiSelect
          value={sortOrder.toLowerCase()}
          onChange={e => setArg('sort', [sortField, e.target.value].join(', '))}
          options={sortOptions}
        />
      </EuiFormRow>
      <EuiFormRow
        label="Fields"
        helpText={
          fields.length <= 10
            ? 'The fields to extract. Kibana scripted fields are not currently available'
            : 'This datasource performs best with 10 or fewer fields'
        }
      >
        <ESFieldsSelect
          index={index}
          onChange={fields => setArg('fields', fields.join(', '))}
          selected={fields}
        />
      </EuiFormRow>
    </div>
  );
};

EsdocsDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
};

export const esdocs = () => ({
  name: 'esdocs',
  displayName: 'Elasticsearch raw documents',
  help: 'Pull back raw documents from elasticsearch',
  image: 'logoElasticsearch',
  template: templateFromReactComponent(EsdocsDatasource),
});
