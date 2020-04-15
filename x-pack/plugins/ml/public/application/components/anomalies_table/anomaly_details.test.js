/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { AnomalyDetails } from './anomaly_details';

const props = {
  anomaly: {
    time: 1486018800000,
    source: {
      job_id: 'it-ops-count-by-mlcategory-one',
      result_type: 'record',
      probability: 0.004741615571416013,
      multi_bucket_impact: 0,
      record_score: 25.662,
      initial_record_score: 41.00971774894037,
      bucket_span: 900,
      detector_index: 0,
      is_interim: false,
      timestamp: 1486062900000,
      by_field_name: 'mlcategory',
      by_field_value: '1',
      function: 'count',
      function_description: 'count',
      typical: [0.012071679592192066],
      actual: [1],
      mlcategory: ['1'],
    },
    rowId: '1546553208554_0',
    jobId: 'it-ops-count-by-mlcategory-one',
    detectorIndex: 0,
    severity: 25.662,
    entityName: 'mlcategory',
    entityValue: '1',
    actual: [1],
    actualSort: 1,
    typical: [0.012071679592192066],
    typicalSort: 0.012071679592192066,
    metricDescriptionSort: 82.83851409101328,
    detector: 'count by mlcategory',
    isTimeSeriesViewRecord: false,
  },
  examples: [
    'Actual Transaction Already Voided / Reversed;hostname=dbserver.acme.com;physicalhost=esxserver1.acme.com;vmhost=app1.acme.com',
    'REC Not INSERTED [DB TRAN] Table;hostname=dbserver.acme.com;physicalhost=esxserver1.acme.com;vmhost=app1.acme.com',
  ],
  influencersLimit: 5,
  isAggregatedData: true,
  tabIndex: 0,
};

describe('AnomalyDetails', () => {
  test('Renders with anomaly details tab selected by default', () => {
    const wrapper = shallowWithIntl(<AnomalyDetails {...props} />);

    expect(wrapper.prop('tabs').length).toBe(2);
    expect(wrapper.prop('initialSelectedTab').id).toBe('Details');
  });

  test('Renders with category tab selected when index set to 1', () => {
    const categoryTabProps = {
      ...props,
      tabIndex: 1,
    };
    const wrapper = shallowWithIntl(<AnomalyDetails {...categoryTabProps} />);
    expect(wrapper.prop('initialSelectedTab').id).toBe('Category examples');
  });

  test('Renders with terms and regex when definition prop is not undefined', () => {
    const categoryTabProps = {
      ...props,
      tabIndex: 1,
      definition: {
        terms: 'example terms for test',
        regex: '.*?DBMS.+?ERROR.+?svc_prod.+?Err.+?Microsoft.+?ODBC.+?SQL.+?Server.+?Driver',
      },
    };

    const wrapper = mountWithIntl(<AnomalyDetails {...categoryTabProps} />);

    expect(wrapper.containsMatchingElement(<h4>Regex</h4>)).toBe(true);
    expect(wrapper.containsMatchingElement(<h4>Terms</h4>)).toBe(true);
    expect(wrapper.contains(<h4>Examples</h4>)).toBe(true);
  });

  test('Renders only with examples when definition prop is undefined', () => {
    const categoryTabProps = {
      ...props,
      tabIndex: 1,
      definition: undefined,
    };

    const wrapper = mountWithIntl(<AnomalyDetails {...categoryTabProps} />);

    expect(wrapper.containsMatchingElement(<h4>Regex</h4>)).toBe(false);
    expect(wrapper.containsMatchingElement(<h4>Terms</h4>)).toBe(false);
    expect(wrapper.contains(<h4>Examples</h4>)).toBe(false);
  });

  test('Renders only with terms when definition.regex is undefined', () => {
    const categoryTabProps = {
      ...props,
      tabIndex: 1,
      definition: {
        terms: 'example terms for test',
      },
    };

    const wrapper = mountWithIntl(<AnomalyDetails {...categoryTabProps} />);

    expect(wrapper.containsMatchingElement(<h4>Regex</h4>)).toBe(false);
    expect(wrapper.containsMatchingElement(<h4>Terms</h4>)).toBe(true);
    expect(wrapper.contains(<h4>Examples</h4>)).toBe(true);
  });

  test('Renders only with regex when definition.terms is undefined', () => {
    const categoryTabProps = {
      ...props,
      tabIndex: 1,
      definition: {
        regex: '.*?DBMS.+?ERROR.+?svc_prod.+?Err.+?Microsoft.+?ODBC.+?SQL.+?Server.+?Driver',
      },
    };

    const wrapper = mountWithIntl(<AnomalyDetails {...categoryTabProps} />);

    expect(wrapper.containsMatchingElement(<h4>Regex</h4>)).toBe(true);
    expect(wrapper.containsMatchingElement(<h4>Terms</h4>)).toBe(false);
    expect(wrapper.contains(<h4>Examples</h4>)).toBe(true);
  });
});
