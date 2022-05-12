/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  replaceTokensInUrlValue,
  getUrlForRecord,
  isValidLabel,
  isValidTimeRange,
  openCustomUrlWindow,
  getQueryField,
} from './custom_url_utils';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';
import {
  CustomUrlAnomalyRecordDoc,
  KibanaUrlConfig,
  UrlConfig,
} from '../../../common/types/custom_urls';

describe('ML - custom URL utils', () => {
  const TEST_DOC: AnomalyRecordDoc = {
    job_id: 'farequote',
    result_type: 'record',
    probability: 6.533287347648861e-45,
    record_score: 93.84475,
    initial_record_score: 94.867922946384,
    bucket_span: 300,
    detector_index: 0,
    is_interim: false,
    timestamp: 1486656600000,
    partition_field_name: 'airline',
    partition_field_value: 'AAL',
    function: 'mean',
    function_description: 'mean',
    typical: [99.2329899996025],
    actual: [274.7279901504516],
    field_name: 'responsetime',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['AAL'],
      },
    ],
    airline: ['AAL'],
  };

  const TEST_RECORD: CustomUrlAnomalyRecordDoc = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z',
  };

  const TEST_RECORD_SPECIAL_CHARS = {
    ...TEST_DOC,
    earliest: '2017-02-09T15:10:00.000Z',
    latest: '2017-02-09T17:15:00.000Z',
    partition_field_value: '<>:;[}")',
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['<>:;[}")'],
      },
      {
        influencer_field_name: 'odd:field,name',
        influencer_field_values: [">:&12<'"],
      },
    ],
    airline: ['<>:;[}")'],
    'odd:field,name': [">:&12<'"],
  };

  const TEST_RECORD_MULTIPLE_INFLUENCER_VALUES: CustomUrlAnomalyRecordDoc = {
    ...TEST_RECORD,
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: ['AAL', 'AWE'],
      },
    ],
    airline: ['AAL', 'AWE'],
  };

  const TEST_RECORD_NO_INFLUENCER_VALUES: CustomUrlAnomalyRecordDoc = {
    ...TEST_RECORD,
    influencers: [
      {
        influencer_field_name: 'airline',
        influencer_field_values: [],
      },
    ],
    airline: null,
  };

  const TEST_DASHBOARD_URL: KibanaUrlConfig = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"$airline$\"'))",
  };

  const TEST_DISCOVER_URL: KibanaUrlConfig = {
    url_name: 'Raw data',
    time_range: 'auto',
    url_value:
      "discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'airline:\"$airline$\" and odd:field,name : $odd:field,name$'))",
  };

  const TEST_DASHBOARD_LUCENE_URL: KibanaUrlConfig = {
    url_name: 'Show dashboard',
    time_range: '1h',
    url_value:
      "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:lucene,query:'airline:\"$airline$\"'))",
  };

  const TEST_OTHER_URL: UrlConfig = {
    url_name: 'Show airline',
    url_value: 'http://airlinecodes.info/airline-code-$airline$',
  };

  const TEST_OTHER_URL_NO_TOKENS: UrlConfig = {
    url_name: 'Show docs',
    url_value: 'https://www.elastic.co/guide/index.html',
  };

  describe('replaceTokensInUrlValue', () => {
    test('replaces tokens as expected for a Kibana Dashboard type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_DOC, 'timestamp')).toBe(
        "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'\"airline\":\"AAL\"'))"
      );
    });

    test('replaces tokens containing special characters as expected for a Kibana Dashboard type URL', () => {
      expect(
        replaceTokensInUrlValue(TEST_DASHBOARD_URL, 300, TEST_RECORD_SPECIAL_CHARS, 'timestamp')
      ).toBe(
        "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'\"airline\":\"%3C%3E%3A%3B%5B%7D%5C%22)\"'))"
      );
    });

    test('replaces tokens containing special characters as expected for a Kibana Dashboard type URL where query language is lucene', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DASHBOARD_LUCENE_URL,
          300,
          TEST_RECORD_SPECIAL_CHARS,
          'timestamp'
        )
      ).toBe(
        "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:lucene,query:'airline:\"%5C%3C%5C%3E%5C%3A%3B%5C%5B%5C%7D%5C%22%5C)\"'))"
      );
    });

    test('replaces tokens as expected for a Kibana Discover type URL', () => {
      expect(replaceTokensInUrlValue(TEST_DISCOVER_URL, 300, TEST_DOC, 'timestamp')).toBe(
        "discover#/?_g=(time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'\"airline\":\"AAL\"'))"
      );
    });

    test('replaces token with multiple influencer values', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DISCOVER_URL,
          300,
          TEST_RECORD_MULTIPLE_INFLUENCER_VALUES,
          'timestamp'
        )
      ).toBe(
        'discover#/?_g=(time:(from:\'2017-02-09T16:05:00.000Z\',mode:absolute,to:\'2017-02-09T16:20:00.000Z\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'("airline":"AAL" OR "airline":"AWE")\'))'
      );
    });

    test('removes tokens with no influencer values', () => {
      expect(
        replaceTokensInUrlValue(
          TEST_DISCOVER_URL,
          300,
          TEST_RECORD_NO_INFLUENCER_VALUES,
          'timestamp'
        )
      ).toBe(
        "discover#/?_g=(time:(from:'2017-02-09T16:05:00.000Z',mode:absolute,to:'2017-02-09T16:20:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:''))"
      );
    });

    test('replaces tokens as expected for other type URL with tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL, 300, TEST_DOC, 'timestamp')).toBe(
        'http://airlinecodes.info/airline-code-AAL'
      );
    });

    test('replaces tokens as expected for other type URL without tokens', () => {
      expect(replaceTokensInUrlValue(TEST_OTHER_URL_NO_TOKENS, 300, TEST_DOC, 'timestamp')).toBe(
        'https://www.elastic.co/guide/index.html'
      );
    });

    test('replaces tokens outside of a query', () => {
      const TEST_DOC_WITH_METHOD: AnomalyRecordDoc = {
        ...TEST_DOC,
        method: ['POST'],
      };
      const TEST_MULTIPLE_NON_QUERY_TOKENS: UrlConfig = {
        url_name: 'no_query',
        url_value: `dashboards#/view/b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'2018-12-17T00:00:00.000Z',mode:absolute,to:'2018-12-17T09:00:00.000Z'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:$method$),type:phrase,value:$method$),query:(match:(method:(query:$method$,type:phrase))))))`,
      };
      expect(
        replaceTokensInUrlValue(
          TEST_MULTIPLE_NON_QUERY_TOKENS,
          300,
          TEST_DOC_WITH_METHOD,
          'timestamp'
        )
      ).toBe(
        `dashboards#/view/b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'2018-12-17T00:00:00.000Z',mode:absolute,to:'2018-12-17T09:00:00.000Z'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:POST),type:phrase,value:POST),query:(match:(method:(query:POST,type:phrase))))))`
      );
    });

    test('truncates long queries', () => {
      const TEST_DOC_WITH_METHOD: AnomalyRecordDoc = {
        ...TEST_DOC,
        influencers: [
          {
            influencer_field_name: 'action',
            influencer_field_values: ['dashboard-widgets', 'edit', 'delete'],
          },
          {
            influencer_field_name: 'method',
            influencer_field_values: ['POST'],
          },
          {
            influencer_field_name: 'clientip',
            influencer_field_values: ['92.20.59.36', '92.20.59.41'],
          },
        ],
        action: ['dashboard-widgets', 'edit', 'delete'],
        clientip: ['92.20.59.36', '92.20.59.41'],
        referer: ['http://www.example.com/wp-admin/post.php?post=51&action=edit'],
        method: 'POST',
      };
      const TEST_MULTIPLE_NON_QUERY_TOKENS: UrlConfig = {
        url_name: 'massive_url',
        url_value: `discover#/11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7e06e310-dae4-11e9-8260-995f99197467',key:method,negate:!f,params:(query:$method$),type:phrase,value:$method$),query:(match:(method:(query:$method$,type:phrase))))),index:'7e06e310-dae4-11e9-8260-995f99197467',interval:auto,query:(language:kuery,query:'clientip:$clientip$ and action:$action$ and referer:$referer$'),sort:!(!('@timestamp',desc)))`,
      };
      expect(
        replaceTokensInUrlValue(
          TEST_MULTIPLE_NON_QUERY_TOKENS,
          300,
          TEST_DOC_WITH_METHOD,
          'timestamp'
        )
      ).toBe(
        'discover#/11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61-b3ad9930-db86-11e9-b5d5-e3a9ca224c61?_g=(filters:!(),time:(from:\'2017-02-09T16:05:00.000Z\',mode:absolute,to:\'2017-02-09T16:20:00.000Z\'))&_a=(columns:!(_source),filters:!((\'$state\':(store:appState),meta:(alias:!n,disabled:!f,index:\'7e06e310-dae4-11e9-8260-995f99197467\',key:method,negate:!f,params:(query:POST),type:phrase,value:POST),query:(match:(method:(query:POST,type:phrase))))),index:\'7e06e310-dae4-11e9-8260-995f99197467\',interval:auto,query:(language:kuery,query:\'("clientip":"92.20.59.36" OR "clientip":"92.20.59.41") AND ("action":"dashboard-widgets" OR "action":"edit" OR "action":"delete")\'),sort:!(!(\'@timestamp\',desc)))'
      );
    });
  });

  describe('getUrlForRecord', () => {
    test('returns expected URL for a Kibana Dashboard type URL', () => {
      expect(getUrlForRecord(TEST_DASHBOARD_URL, TEST_RECORD)).toBe(
        "dashboards#/view/5f112420-9fc6-11e8-9130-150552a4bef3?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(filters:!(),query:(language:kuery,query:'\"airline\":\"AAL\"'))"
      );
    });

    test('returns expected URL for a Kibana Discover type URL', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD)).toBe(
        "discover#/?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:'\"airline\":\"AAL\"'))"
      );
    });

    test('returns expected URL for a Kibana Discover type URL when record field contains special characters', () => {
      expect(getUrlForRecord(TEST_DISCOVER_URL, TEST_RECORD_SPECIAL_CHARS)).toBe(
        'discover#/?_g=(time:(from:\'2017-02-09T15:10:00.000Z\',mode:absolute,to:\'2017-02-09T17:15:00.000Z\'))&_a=(index:bf6e5860-9404-11e8-8d4c-593f69c47267,query:(language:kuery,query:\'"airline":"%3C%3E%3A%3B%5B%7D%5C%22)" AND "odd:field,name":"%3E%3A%2612%3C!\'"\'))'
      );
    });

    test('correctly encodes special characters inside of a query string', () => {
      const testUrl = {
        url_name: 'Show dashboard',
        time_range: 'auto',
        url_value: `dashboards#/view/351de820-f2bb-11ea-ab06-cb93221707e9?_a=(filters:!(),query:(language:kuery,query:'at@name:"$at@name$" and singlequote!'name:"$singlequote!'name$"'))&_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))`,
      };

      const testRecord = {
        job_id: 'spec-char',
        result_type: 'record',
        probability: 0.0028099428534745633,
        multi_bucket_impact: 5,
        record_score: 49.00785814424704,
        initial_record_score: 49.00785814424704,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1549593000000,
        partition_field_name: 'at@name',
        partition_field_value: "contains a ' quote",
        function: 'mean',
        function_description: 'mean',
        typical: [1993.2657340111837],
        actual: [1808.3334418402778],
        field_name: 'metric%$£&!{(]field',
        influencers: [
          {
            influencer_field_name: "singlequote'name",
            influencer_field_values: ["contains a ' quote"],
          },
          {
            influencer_field_name: 'at@name',
            influencer_field_values: ["contains a ' quote"],
          },
        ],
        "singlequote'name": ["contains a ' quote"],
        'at@name': ["contains a ' quote"],
        earliest: '2019-02-08T00:00:00.000Z',
        latest: '2019-02-08T23:59:59.999Z',
      };

      expect(getUrlForRecord(testUrl, testRecord)).toBe(
        "dashboards#/view/351de820-f2bb-11ea-ab06-cb93221707e9?_a=(filters:!(),query:(language:kuery,query:'\"at@name\":\"contains%20a%20!'%20quote\" AND \"singlequote!'name\":\"contains%20a%20!'%20quote\"'))&_g=(filters:!(),time:(from:'2019-02-08T00:00:00.000Z',mode:absolute,to:'2019-02-08T23:59:59.999Z'))"
      );
    });

    test('replaces tokens with nesting', () => {
      const testUrlApache: KibanaUrlConfig = {
        url_name: 'Raw data',
        time_range: 'auto',
        url_value:
          'dashboards#/view/ml_http_access_explorer_ecs?_g=(time:(from:\u0027$earliest$\u0027,mode:absolute,to:\u0027$latest$\u0027))&_a=(description:\u0027\u0027,filters:!((\u0027$state\u0027:(store:appState),meta:(alias:!n,disabled:!f,index:\u0027INDEX_PATTERN_ID\u0027,key:event.dataset,negate:!f,params:(query:\u0027apache.access\u0027),type:phrase,value:\u0027apache.access\u0027),query:(match:(event.dataset:(query:\u0027apache.access\u0027,type:phrase)))),(\u0027$state\u0027:(store:appState),meta:(alias:!n,disabled:!f,index:\u0027INDEX_PATTERN_ID\u0027,key:http.response.status_code,negate:!f,params:(query:\u0027$http.response.status_code$\u0027),type:phrase,value:\u0027$http.response.status_code$\u0027),query:(match:(http.response.status_code:(query:\u0027$http.response.status_code$\u0027,type:phrase))))),query:(language:kuery,query:\u0027\u0027))',
      };

      const testRecord = {
        job_id: 'farequote',
        result_type: 'record',
        probability: 6.533287347648861e-45,
        record_score: 93.84475,
        initial_record_score: 94.867922946384,
        bucket_span: 300,
        detector_index: 0,
        is_interim: false,
        timestamp: 1486656600000,
        function: 'mean',
        function_description: 'mean',
        typical: [99.2329899996025],
        actual: [274.7279901504516],
        field_name: 'responsetime',
        earliest: '2017-02-09T15:10:00.000Z',
        latest: '2017-02-09T17:15:00.000Z',
        http: {
          response: {
            status_code: 403,
          },
        },
      };

      expect(getUrlForRecord(testUrlApache, testRecord)).toBe(
        "dashboards#/view/ml_http_access_explorer_ecs?_g=(time:(from:'2017-02-09T15:10:00.000Z',mode:absolute,to:'2017-02-09T17:15:00.000Z'))&_a=(description:\u0027\u0027,filters:!((\u0027$state\u0027:(store:appState),meta:(alias:!n,disabled:!f,index:\u0027INDEX_PATTERN_ID\u0027,key:event.dataset,negate:!f,params:(query:\u0027apache.access\u0027),type:phrase,value:\u0027apache.access\u0027),query:(match:(event.dataset:(query:\u0027apache.access\u0027,type:phrase)))),(\u0027$state\u0027:(store:appState),meta:(alias:!n,disabled:!f,index:\u0027INDEX_PATTERN_ID\u0027,key:http.response.status_code,negate:!f,params:(query:\u0027403\u0027),type:phrase,value:\u0027403\u0027),query:(match:(http.response.status_code:(query:\u0027403\u0027,type:phrase))))),query:(language:kuery,query:\u0027\u0027))"
      );
    });

    test('does not escape special characters for Lucene query language inside of the filter', () => {
      const testUrlLuceneFilters: KibanaUrlConfig = {
        url_name: 'Lucene query with filters',
        time_range: 'auto',
        url_value:
          "dashboards#/view/884c8780-0618-11ea-b671-c9c7e0ebf1f2?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'$earliest$',to:'$latest$'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7a0a6120-0612-11ea-b671-c9c7e0ebf1f2',key:'at@name',negate:!f,params:(query:'$at@name$'),type:phrase),query:(match_phrase:('at@name':'$at@name$')))),fullScreenMode:!f,options:(hidePanelTitles:!f,useMargins:!t),panels:!((embeddableConfig:(),gridData:(h:15,i:f7ef89e3-62a6-42da-84b2-c815d8da8bb4,w:24,x:0,y:0),id:'19067710-0617-11ea-b671-c9c7e0ebf1f2',panelIndex:f7ef89e3-62a6-42da-84b2-c815d8da8bb4,type:visualization,version:'8.0.0')),query:(language:lucene,query:''),timeRestore:!f,title:special-lucine,viewMode:view)",
      };

      const testRecord = {
        job_id: 'special-chars-job-1',
        result_type: 'record',
        probability: 0.01460073141268696,
        multi_bucket_impact: -5,
        record_score: 23.817016191989776,
        initial_record_score: 23.817016191989776,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1549548900000,
        partition_field_name: 'at@name',
        partition_field_value: 'contains\\ and a /',
        function: 'mean',
        function_description: 'mean',
        typical: [998.382636366326],
        actual: [903.4208848741321],
        field_name: 'metric%$£&!{(]field',
        earliest: '2017-02-09T15:10:00.000Z',
        latest: '2017-02-09T17:15:00.000Z',
        influencers: [
          { influencer_field_name: 'at@name', influencer_field_values: ['contains\\ and a /'] },
        ],
        'at@name': ['contains\\ and a /'],
      };

      expect(getUrlForRecord(testUrlLuceneFilters, testRecord)).toBe(
        "dashboards#/view/884c8780-0618-11ea-b671-c9c7e0ebf1f2?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2017-02-09T15:10:00.000Z',to:'2017-02-09T17:15:00.000Z'))&_a=(description:'',filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'7a0a6120-0612-11ea-b671-c9c7e0ebf1f2',key:'at@name',negate:!f,params:(query:'contains%5C%20and%20a%20%2F'),type:phrase),query:(match_phrase:('at@name':'contains%5C%20and%20a%20%2F')))),fullScreenMode:!f,options:(hidePanelTitles:!f,useMargins:!t),panels:!((embeddableConfig:(),gridData:(h:15,i:f7ef89e3-62a6-42da-84b2-c815d8da8bb4,w:24,x:0,y:0),id:'19067710-0617-11ea-b671-c9c7e0ebf1f2',panelIndex:f7ef89e3-62a6-42da-84b2-c815d8da8bb4,type:visualization,version:'8.0.0')),query:(language:lucene,query:''),timeRestore:!f,title:special-lucine,viewMode:view)"
      );
    });

    test('returns expected URL for APM', () => {
      const urlConfig = {
        url_name: 'APM',
        time_range: '2h',
        url_value:
          'apm#/traces?rangeFrom=$earliest$&rangeTo=$latest$&kuery=trace.id:"$trace.id$" and transaction.name:"$transaction.name$"&_g=()',
      };

      const testRecords = {
        job_id: 'abnormal_trace_durations_nodejs',
        result_type: 'record',
        probability: 0.025597710862701226,
        multi_bucket_impact: 5,
        record_score: 13.124152090331723,
        initial_record_score: 13.124152090331723,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1573339500000,
        by_field_name: 'transaction.name',
        by_field_value: 'GET /test-data',
        function: 'high_mean',
        function_description: 'mean',
        typical: [802.0600710562369],
        actual: [761.1531339031332],
        field_name: 'transaction.duration.us',
        influencers: [
          {
            influencer_field_name: 'transaction.name',
            influencer_field_values: ['GET /test-data'],
          },
          {
            influencer_field_name: 'trace.id',
            influencer_field_values: [
              '000a09d58a428f38550e7e87637733c1',
              '0039c771d8bbadf6137767d3aeb89f96',
              '01279ed5bb9f4249e3822d16dec7f2f2',
            ],
          },
          {
            influencer_field_name: 'service.name',
            influencer_field_values: ['example-service'],
          },
        ],
        'trace.id': [
          '000a09d58a428f38550e7e87637733c1',
          '0039c771d8bbadf6137767d3aeb89f96',
          '01279ed5bb9f4249e3822d16dec7f2f2',
        ],
        'service.name': ['example-service'],
        'transaction.name': ['GET /test-data'],
        earliest: '2019-11-09T20:45:00.000Z',
        latest: '2019-11-10T01:00:00.000Z',
      };

      expect(getUrlForRecord(urlConfig, testRecords)).toBe(
        'apm#/traces?rangeFrom=2019-11-09T20:45:00.000Z&rangeTo=2019-11-10T01:00:00.000Z&kuery=(trace.id:"000a09d58a428f38550e7e87637733c1" OR trace.id:"0039c771d8bbadf6137767d3aeb89f96" OR trace.id:"01279ed5bb9f4249e3822d16dec7f2f2") AND transaction.name:"GET%20%2Ftest-data"&_g=()'
      );
    });

    test('return expected URL for Security app', () => {
      const urlConfig = {
        url_name: 'Hosts Details by process name',
        url_value:
          "security/hosts/ml-hosts/$host.name$?_g=()&query=(query:'process.name%20:%20%22$process.name$%22',language:kuery)&timerange=(global:(linkTo:!(timeline),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')),timeline:(linkTo:!(global),timerange:(from:'$earliest$',kind:absolute,to:'$latest$')))",
      };

      const testRecords = {
        job_id: 'rare_process_by_host_linux_ecs',
        result_type: 'record',
        probability: 0.018122957282324745,
        multi_bucket_impact: 0,
        record_score: 20.513469583273547,
        initial_record_score: 20.513469583273547,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1549043100000,
        by_field_name: 'process.name',
        by_field_value: 'seq',
        partition_field_name: 'host.name',
        partition_field_value: 'showcase',
        function: 'rare',
        function_description: 'rare',
        typical: [0.018122957282324745],
        actual: [1],
        influencers: [
          {
            influencer_field_name: 'user.name',
            influencer_field_values: ['sophie'],
          },
          {
            influencer_field_name: 'process.name',
            influencer_field_values: ['seq'],
          },
          {
            influencer_field_name: 'host.name',
            influencer_field_values: ['showcase'],
          },
        ],
        'process.name': ['seq'],
        'user.name': ['sophie'],
        'host.name': ['showcase'],
        earliest: '2019-02-01T16:00:00.000Z',
        latest: '2019-02-01T18:59:59.999Z',
      };

      expect(getUrlForRecord(urlConfig, testRecords)).toBe(
        "security/hosts/ml-hosts/showcase?_g=()&query=(language:kuery,query:'\"process.name\":\"seq\"')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-02-01T16:00:00.000Z',kind:absolute,to:'2019-02-01T18:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-02-01T16%3A00%3A00.000Z',kind:absolute,to:'2019-02-01T18%3A59%3A59.999Z')))"
      );
    });

    test('return expected URL for Metrics app', () => {
      const urlConfig = {
        url_name: 'Hosts Details by process name',
        url_value:
          'metrics/detail/host/$host.name$?metricTime=(autoReload:!f,refreshInterval:5000,time:(from:%27$earliest$%27,interval:%3E%3D1m,to:%27$latest$%27))',
      };

      const testRecord = {
        job_id: 'hosts_memory_usage',
        result_type: 'record',
        probability: 0.0001288876418224276,
        multi_bucket_impact: -5,
        record_score: 88.26287,
        initial_record_score: 61.553927615180186,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1599571800000,
        function: 'max',
        function_description: 'max',
        typical: [0.23685835059986396],
        actual: [0.258],
        field_name: 'system.memory.actual.used.pct',
        influencers: [
          {
            influencer_field_name: 'host.name',
            influencer_field_values: ['gke-dev-next-oblt-dev-next-oblt-pool-404d7f0c-2bfl'],
          },
        ],
        'host.name': ['gke-dev-next-oblt-dev-next-oblt-pool-404d7f0c-2bfl'],
        earliest: '2019-09-08T12:00:00.000Z',
        latest: '2019-09-08T14:59:59.999Z',
      };

      expect(getUrlForRecord(urlConfig, testRecord)).toBe(
        "metrics/detail/host/gke-dev-next-oblt-dev-next-oblt-pool-404d7f0c-2bfl?metricTime=(autoReload:!f,refreshInterval:5000,time:(from:'2019-09-08T12:00:00.000Z',interval:>=1m,to:'2019-09-08T14:59:59.999Z'))"
      );
    });

    test('removes an empty path component with a trailing slash', () => {
      const urlConfig = {
        url_name: 'APM',
        time_range: '2h',
        url_value:
          'apm#/services/$service.name$/transactions?rangeFrom=$earliest$&rangeTo=$latest$&refreshPaused=true&refreshInterval=0&kuery=&transactionType=request',
      };

      const testRecords = {
        job_id: 'decreased_throughput_jsbase',
        result_type: 'record',
        probability: 8.91350850732573e-9,
        multi_bucket_impact: 5,
        record_score: 93.63625728951217,
        initial_record_score: 93.63625728951217,
        bucket_span: 900,
        detector_index: 0,
        is_interim: false,
        timestamp: 1573266600000,
        function: 'low_count',
        function_description: 'count',
        typical: [100615.66506877479],
        actual: [25251],
        earliest: '2019-11-09T00:30:00.000Z',
        latest: '2019-11-09T04:45:00.000Z',
      };

      expect(getUrlForRecord(urlConfig, testRecords)).toBe(
        'apm#/services/transactions?rangeFrom=2019-11-09T00:30:00.000Z&rangeTo=2019-11-09T04:45:00.000Z&refreshPaused=true&refreshInterval=0&kuery=&transactionType=request'
      );
    });

    test('returns expected URL for other type URL', () => {
      expect(getUrlForRecord(TEST_OTHER_URL, TEST_RECORD)).toBe(
        'http://airlinecodes.info/airline-code-AAL'
      );
    });

    test('returns expected URL with preserving custom filter', () => {
      const urlWithCustomFilter: UrlConfig = {
        url_name: 'URL with a custom filter',
        url_value: `discover#/?_g=(time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:subSystem.keyword,negate:!f,params:(query:JDBC),type:phrase),query:(match_phrase:(subSystem.keyword:JDBC)))),index:'eap_wls_server_12c*,*:eap_wls_server_12c*',query:(language:kuery,query:'wlscluster.keyword:"$wlscluster.keyword$"'))`,
      };

      const testRecords = {
        job_id: 'farequote',
        result_type: 'record',
        probability: 6.533287347648861e-45,
        record_score: 93.84475,
        initial_record_score: 94.867922946384,
        bucket_span: 300,
        detector_index: 0,
        is_interim: false,
        timestamp: 1486656600000,
        partition_field_name: 'wlscluster.keyword',
        partition_field_value: 'AAL',
        function: 'mean',
        function_description: 'mean',
        typical: [99.2329899996025],
        actual: [274.7279901504516],
        field_name: 'wlscluster.keyword',
        influencers: [
          {
            influencer_field_name: 'wlscluster.keyword',
            influencer_field_values: ['AAL'],
          },
        ],
        'wlscluster.keyword': ['AAL'],
        earliest: '2019-02-01T16:00:00.000Z',
        latest: '2019-02-01T18:59:59.999Z',
      };

      expect(getUrlForRecord(urlWithCustomFilter, testRecords)).toBe(
        "discover#/?_g=(time:(from:'2019-02-01T16:00:00.000Z',mode:absolute,to:'2019-02-01T18:59:59.999Z'))&_a=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:subSystem.keyword,negate:!f,params:(query:JDBC),type:phrase),query:(match_phrase:(subSystem.keyword:JDBC)))),index:'eap_wls_server_12c*,*:eap_wls_server_12c*',query:(language:kuery,query:'\"wlscluster.keyword\":\"AAL\"'))"
      );
    });
  });

  describe('getQueryField', () => {
    test('accounts for colon : in field name', () => {
      expect(getQueryField(`odd:field,name : " $odd:field,name$"`)).toBe('odd:field,name');
      expect(getQueryField(`odd:field,name: $odd:field,name$ "`)).toBe('odd:field,name');
      expect(getQueryField(`odd:field,name:$odd:field,name$"`)).toBe('odd:field,name');
      expect(getQueryField(`odd:field,name: " $odd:field,name$"`)).toBe('odd:field,name');
      expect(getQueryField(`odd:field,name&:$odd:field,name&$"`)).toBe('odd:field,name&');
      expect(getQueryField('{air}line:${air}line$')).toBe('{air}line');
      expect(getQueryField(`odd:field$name&:$odd:field$name&$`)).toBe('odd:field$name&');
    });

    test('accounts for spaces in query string', () => {
      expect(getQueryField(`airline : $airline$"`)).toBe('airline');
      expect(getQueryField(`airline:" $airline$""`)).toBe('airline');
      expect(getQueryField(`airline:$airline$"`)).toBe('airline');
    });
  });

  describe('isValidLabel', () => {
    const testUrls = [TEST_DASHBOARD_URL, TEST_DISCOVER_URL, TEST_OTHER_URL];
    test('returns true for a unique label', () => {
      expect(isValidLabel('Drilldown dashboard', testUrls)).toBe(true);
    });

    test('returns false for a duplicate label', () => {
      expect(isValidLabel('Show dashboard', testUrls)).toBe(false);
    });

    test('returns false for a blank label', () => {
      expect(isValidLabel('', testUrls)).toBe(false);
    });
  });

  describe('isValidTimeRange', () => {
    test('returns true for valid values', () => {
      expect(isValidTimeRange('1h')).toBe(true);
      expect(isValidTimeRange('6h')).toBe(true);
      expect(isValidTimeRange('5m')).toBe(true);
      expect(isValidTimeRange('auto')).toBe(true);
      expect(isValidTimeRange('')).toBe(true);
    });

    test('returns false for invalid values', () => {
      expect(isValidTimeRange('1hour')).toBe(false);
      expect(isValidTimeRange('uato')).toBe(false);
      expect(isValidTimeRange('AUTO')).toBe(false);
    });
  });

  describe('openCustomUrlWindow', () => {
    const originalOpen = window.open;

    beforeEach(() => {
      delete (window as any).open;
      const mockOpen = jest.fn();
      window.open = mockOpen;
    });

    afterEach(() => {
      window.open = originalOpen;
    });

    it('should add the base path to a relative non-kibana url', () => {
      openCustomUrlWindow(
        'the-url',
        { url_name: 'the-url-name', url_value: 'the-url-value' },
        'the-base-path'
      );
      expect(window.open).toHaveBeenCalledWith('the-base-path/the-url', '_blank');
    });

    it('should add the base path and `app` prefix to a relative kibana url', () => {
      openCustomUrlWindow(
        'discover#/the-url',
        { url_name: 'the-url-name', url_value: 'discover#/the-url-value' },
        'the-base-path'
      );
      expect(window.open).toHaveBeenCalledWith('the-base-path/app/discover#/the-url', '_blank');
    });

    it('should use an absolute url with protocol as is', () => {
      openCustomUrlWindow(
        'http://example.com',
        { url_name: 'the-url-name', url_value: 'http://example.com' },
        'the-base-path'
      );
      expect(window.open).toHaveBeenCalledWith(
        'http://example.com',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });
});
