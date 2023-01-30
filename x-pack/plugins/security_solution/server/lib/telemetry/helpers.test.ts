/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { createMockPackagePolicy, stubClusterInfo, stubLicenseInfo } from './__mocks__';
import {
  LIST_DETECTION_RULE_EXCEPTION,
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
} from './constants';
import {
  extractEndpointPolicyConfig,
  getPreviousDiagTaskTimestamp,
  getPreviousDailyTaskTimestamp,
  batchTelemetryRecords,
  isPackagePolicyList,
  templateExceptionList,
  addDefaultAdvancedPolicyConfigSettings,
  formatValueListMetaData,
  tlog,
  setIsElasticCloudDeployment,
  createTaskMetric,
} from './helpers';
import type { ESClusterInfo, ESLicense, ExceptionListItem } from './types';
import type { PolicyConfig, PolicyData } from '../../../common/endpoint/types';
import { cloneDeep, set } from 'lodash';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('test diagnostic telemetry scheduled task timing helper', () => {
  test('test -5 mins is returned when there is no previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = undefined;
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(5, 'minutes').toISOString());
  });

  test('test -6 mins is returned when there was a previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(6, 'minutes').toISOString();
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(executeFrom);
  });

  // it's possible if Kibana is down for a prolonged period the stored lastRun would have drifted
  // if that is the case we will just roll it back to a 10 min search window
  test('test 10 mins is returned when previous task run took longer than 10 minutes', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(142, 'minutes').toISOString();
    const newExecuteFrom = getPreviousDiagTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(10, 'minutes').toISOString());
  });
});

describe('test endpoint meta telemetry scheduled task timing helper', () => {
  test('test -24 hours is returned when there is no previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = undefined;
    const newExecuteFrom = getPreviousDailyTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(24, 'hours').toISOString());
  });

  test('test -24 hours is returned when there was a previous task run', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(24, 'hours').toISOString();
    const newExecuteFrom = getPreviousDailyTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(executeFrom);
  });

  // it's possible if Kibana is down for a prolonged period the stored lastRun would have drifted
  // if that is the case we will just roll it back to a 30 hour search window
  test('test 24 hours is returned when previous task run took longer than 24 hours', async () => {
    const executeTo = moment().utc().toISOString();
    const executeFrom = moment(executeTo).subtract(72, 'hours').toISOString(); // down 3 days
    const newExecuteFrom = getPreviousDailyTaskTimestamp(executeTo, executeFrom);

    expect(newExecuteFrom).toEqual(moment(executeTo).subtract(24, 'hours').toISOString());
  });
});

describe('telemetry batching logic', () => {
  test('records can be batched oddly as they are sent to the telemetry channel', async () => {
    const stubTelemetryRecords = [...Array(10).keys()];
    const batchSize = 3;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(4);
  });

  test('records can be batched evenly as they are sent to the telemetry channel', async () => {
    const stubTelemetryRecords = [...Array(299).keys()];
    const batchSize = 100;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(3);
  });

  test('empty telemetry records wont be batched', async () => {
    const stubTelemetryRecords = [...Array(0).keys()];
    const batchSize = 100;

    const records = batchTelemetryRecords(stubTelemetryRecords, batchSize);
    expect(records.length).toEqual(0);
  });
});

describe('test package policy type guard', () => {
  test('string records are not package policies', async () => {
    const arr = ['a', 'b', 'c'];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('empty array are not package policies', () => {
    const arr: string[] = [];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('undefined is not a list of package policies', () => {
    const arr = undefined;
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(false);
  });

  test('package policies are list of package policies', () => {
    const arr = [createMockPackagePolicy(), createMockPackagePolicy(), createMockPackagePolicy()];
    const result = isPackagePolicyList(arr);

    expect(result).toEqual(true);
  });
});

describe('list telemetry schema', () => {
  const clusterInfo = {
    cluster_uuid: 'stub_cluster',
    cluster_name: 'stub_cluster',
  } as ESClusterInfo;
  const licenseInfo = { uid: 'stub_license' } as ESLicense;

  test('detection rules document is correctly formed', () => {
    const data = [{ id: 'test_1' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_DETECTION_RULE_EXCEPTION
    );

    expect(templatedItems[0]?.detection_rule).not.toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });

  test('detection rules document is correctly formed with multiple entries', () => {
    const data = [{ id: 'test_2' }, { id: 'test_2' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_DETECTION_RULE_EXCEPTION
    );

    expect(templatedItems[0]?.detection_rule).not.toBeUndefined();
    expect(templatedItems[1]?.detection_rule).not.toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });

  test('trusted apps document is correctly formed', () => {
    const data = [{ id: 'test_1' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_TRUSTED_APPLICATION
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).not.toBeUndefined();
  });

  test('trusted apps document is correctly formed with multiple entries', () => {
    const data = [{ id: 'test_2' }, { id: 'test_2' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_TRUSTED_APPLICATION
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).not.toBeUndefined();
    expect(templatedItems[1]?.trusted_application).not.toBeUndefined();
  });

  test('endpoint exception document is correctly formed', () => {
    const data = [{ id: 'test_3' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_ENDPOINT_EXCEPTION
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).not.toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });

  test('endpoint exception document is correctly formed with multiple entries', () => {
    const data = [{ id: 'test_4' }, { id: 'test_4' }, { id: 'test_4' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_ENDPOINT_EXCEPTION
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).not.toBeUndefined();
    expect(templatedItems[1]?.endpoint_exception).not.toBeUndefined();
    expect(templatedItems[2]?.endpoint_exception).not.toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });

  test('endpoint event filters document is correctly formed', () => {
    const data = [{ id: 'test_5' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_ENDPOINT_EVENT_FILTER
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).not.toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });

  test('endpoint event filters document is correctly formed with multiple entries', () => {
    const data = [{ id: 'test_6' }, { id: 'test_6' }] as ExceptionListItem[];
    const templatedItems = templateExceptionList(
      data,
      clusterInfo,
      licenseInfo,
      LIST_ENDPOINT_EVENT_FILTER
    );

    expect(templatedItems[0]?.detection_rule).toBeUndefined();
    expect(templatedItems[0]?.endpoint_event_filter).not.toBeUndefined();
    expect(templatedItems[1]?.endpoint_event_filter).not.toBeUndefined();
    expect(templatedItems[0]?.endpoint_exception).toBeUndefined();
    expect(templatedItems[0]?.trusted_application).toBeUndefined();
  });
});

describe('test endpoint policy data config extraction', () => {
  const stubPolicyData = {
    id: '872de8c5-85cf-4e1b-a504-9fd39b38570c',
    version: 'WzU4MjkwLDFd',
    name: 'Test Policy Data',
    namespace: 'default',
    description: '',
    package: {
      name: 'endpoint',
      title: 'Endpoint Security',
      version: '1.4.1',
    },
    enabled: true,
    policy_id: '499b5aa7-d214-5b5d-838b-3cd76469844e',
    output_id: '',
    inputs: [
      {
        type: 'endpoint',
        enabled: true,
        streams: [],
        config: null,
      },
    ],
    revision: 1,
    created_at: '2022-01-18T14:52:17.385Z',
    created_by: 'elastic',
    updated_at: '2022-01-18T14:52:17.385Z',
    updated_by: 'elastic',
  } as unknown as PolicyData;

  test('can succeed when policy config is null or empty', async () => {
    const endpointPolicyConfig = extractEndpointPolicyConfig(stubPolicyData);
    expect(endpointPolicyConfig).toBeNull();
  });
});

describe('test advanced policy config overlap ', () => {
  const defaultStubPolicyConfig = {
    windows: {
      events: {
        dll_and_driver_load: true,
        dns: true,
        file: true,
        network: true,
        process: true,
        registry: true,
        security: true,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      ransomware: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        ransomware: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
      antivirus_registration: {
        enabled: false,
      },
    },
    mac: {
      events: {
        process: true,
        file: true,
        network: true,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
    },
    linux: {
      events: {
        process: true,
        file: true,
        network: true,
        session_data: false,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
    },
  } as unknown as PolicyConfig;
  const defaultStubPolicyConfigResponse = {
    linux: {
      events: {
        process: true,
        file: true,
        network: true,
        session_data: false,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
      advanced: {
        agent: {
          connection_delay: null,
        },
        alerts: {
          require_user_artifacts: null,
        },
        artifacts: {
          global: {
            base_url: null,
            manifest_relative_url: null,
            public_key: null,
            interval: null,
            ca_cert: null,
          },
          user: {
            public_key: null,
            ca_cert: null,
            base_url: null,
            interval: null,
          },
        },
        elasticsearch: {
          delay: null,
          tls: {
            verify_peer: null,
            verify_hostname: null,
            ca_cert: null,
          },
        },
        fanotify: {
          ignore_unknown_filesystems: null,
          monitored_filesystems: null,
          ignored_filesystems: null,
        },
        logging: {
          file: null,
          stdout: null,
          stderr: null,
          syslog: null,
        },
        diagnostic: {
          enabled: null,
        },
        malware: {
          quarantine: null,
        },
        memory_protection: {
          memory_scan_collect_sample: null,
          memory_scan: null,
        },
        kernel: {
          capture_mode: null,
        },
        event_filter: {
          default: null,
        },
        utilization_limits: {
          cpu: null,
        },
        logstash: {
          delay: null,
        },
      },
    },
    mac: {
      events: {
        process: true,
        file: true,
        network: true,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
      advanced: {
        agent: {
          connection_delay: null,
        },
        artifacts: {
          global: {
            base_url: null,
            manifest_relative_url: null,
            public_key: null,
            interval: null,
            ca_cert: null,
          },
          user: {
            public_key: null,
            ca_cert: null,
            base_url: null,
            interval: null,
          },
        },
        elasticsearch: {
          delay: null,
          tls: {
            verify_peer: null,
            verify_hostname: null,
            ca_cert: null,
          },
        },
        logging: {
          file: null,
          stdout: null,
          stderr: null,
          syslog: null,
        },
        logstash: {
          delay: null,
        },
        malware: {
          quarantine: null,
          threshold: null,
        },
        kernel: {
          connect: null,
          harden: null,
          process: null,
          filewrite: null,
          network: null,
          network_extension: {
            enable_content_filtering: null,
            enable_packet_filtering: null,
          },
        },
        harden: {
          self_protect: null,
        },
        diagnostic: {
          enabled: null,
        },
        alerts: {
          cloud_lookup: null,

          cloud_lookup_url: null,
        },
        memory_protection: {
          memory_scan_collect_sample: false,
          memory_scan: null,
        },
        event_filter: {
          default: null,
        },
      },
    },
    windows: {
      events: {
        dll_and_driver_load: true,
        dns: true,
        file: true,
        network: true,
        process: true,
        registry: true,
        security: true,
      },
      malware: {
        mode: 'prevent',
        blocklist: true,
      },
      ransomware: {
        mode: 'prevent',
        supported: true,
      },
      memory_protection: {
        mode: 'prevent',
        supported: true,
      },
      behavior_protection: {
        mode: 'prevent',
        supported: true,
      },
      popup: {
        malware: {
          message: '',
          enabled: true,
        },
        ransomware: {
          message: '',
          enabled: true,
        },
        memory_protection: {
          message: '',
          enabled: true,
        },
        behavior_protection: {
          message: '',
          enabled: true,
        },
      },
      logging: {
        file: 'info',
      },
      antivirus_registration: {
        enabled: false,
      },
      advanced: {
        agent: {
          connection_delay: null,
        },
        artifacts: {
          global: {
            base_url: null,
            manifest_relative_url: null,
            public_key: null,
            interval: null,
            ca_cert: null,
          },
          user: {
            public_key: null,
            ca_cert: null,
            base_url: null,
            interval: null,
          },
        },
        elasticsearch: {
          delay: null,
          tls: {
            verify_peer: null,
            verify_hostname: null,
            ca_cert: null,
          },
        },
        logging: {
          file: null,
          stdout: null,
          stderr: null,
          syslog: null,
        },
        malware: {
          quarantine: null,
          threshold: null,
        },
        kernel: {
          connect: null,
          harden: null,
          process: null,
          filewrite: null,
          network: null,
          fileopen: null,
          asyncimageload: null,
          syncimageload: null,
          registry: null,
          fileaccess: null,
          registryaccess: null,
          process_handle: null,
        },
        diagnostic: {
          enabled: null,
          rollback_telemetry_enabled: null,
        },
        alerts: {
          cloud_lookup: null,
          cloud_lookup_url: null,
          require_user_artifacts: null,
        },
        ransomware: {
          mbr: null,
          canary: null,
        },
        memory_protection: {
          context_manipulation_detection: null,
          shellcode: null,
          memory_scan: null,
          shellcode_collect_sample: null,
          memory_scan_collect_sample: null,
          shellcode_enhanced_pe_parsing: null,
          shellcode_trampoline_detection: null,
        },
        event_filter: {
          default: null,
        },
        utilization_limits: {
          cpu: null,
        },
      },
    },
  };

  test('can succeed when policy config does not have any advanced settings already set', async () => {
    const endpointPolicyConfig = addDefaultAdvancedPolicyConfigSettings(
      cloneDeep(defaultStubPolicyConfig)
    );
    expect(endpointPolicyConfig).toEqual(defaultStubPolicyConfigResponse);
  });

  test('can succeed and preserve existing advanced settings', async () => {
    const stubPolicyConfigWithAdvancedSettings = cloneDeep(defaultStubPolicyConfig);
    stubPolicyConfigWithAdvancedSettings.linux.advanced = {
      agent: {
        connection_delay: 20,
      },
    };
    const stubPolicyConfigWithAdvancedSettingsResponse = cloneDeep(defaultStubPolicyConfigResponse);
    set(stubPolicyConfigWithAdvancedSettingsResponse, 'linux.advanced.agent.connection_delay', 20);
    const endpointPolicyConfig = addDefaultAdvancedPolicyConfigSettings(
      stubPolicyConfigWithAdvancedSettings
    );
    expect(endpointPolicyConfig).toEqual(stubPolicyConfigWithAdvancedSettingsResponse);
  });
});

describe('test metrics response to value list meta data', () => {
  test('can succeed when metrics response is fully populated', async () => {
    jest
      .useFakeTimers()
      .setSystemTime(new Date('2023-01-30'));
    const stubMetricResponses = {
      listMetricsResponse: {
        aggregations: {
          total_value_list_count: 5,
          type_breakdown: {
            buckets: [
              {
                key: 'keyword',
                doc_count: 5,
              },
              {
                key: 'ip',
                doc_count: 3,
              },
              {
                key: 'ip_range',
                doc_count: 2,
              },
              {
                key: 'text',
                doc_count: 1,
              },
            ],
          },
        },
      },
      itemMetricsResponse: {
        aggregations: {
          value_list_item_count: {
            buckets: [
              {
                key: 'vl-test1',
                doc_count: 23,
              },
              {
                key: 'vl-test2',
                doc_count: 45,
              },
            ],
          },
        },
      },
      exceptionListMetricsResponse: {
        aggregations: {
          vl_included_in_exception_lists_count: { value: 24 },
        },
      },
      indicatorMatchMetricsResponse: {
        aggregations: {
          vl_used_in_indicator_match_rule_count: { value: 6 },
        },
      },
    };
    const response = formatValueListMetaData(stubMetricResponses, stubClusterInfo, stubLicenseInfo);
    expect(response).toEqual({
      '@timestamp': '2023-01-30T00:00:00.000Z',
      cluster_uuid: '5Pr5PXRQQpGJUTn0czAvKQ',
      cluster_name: 'elasticsearch',
      license_id: '4a7dde08-e5f8-4e50-80f8-bc85b72b4934',
      total_list_count: 5,
      types: [
        {
          type: 'keyword',
          count: 5,
        },
        {
          type: 'ip',
          count: 3,
        },
        {
          type: 'ip_range',
          count: 2,
        },
        {
          type: 'text',
          count: 1,
        },
      ],
      lists: [
        {
          id: 'vl-test1',
          count: 23,
        },
        {
          id: 'vl-test2',
          count: 45,
        },
      ],
      included_in_exception_lists_count: 24,
      used_in_indicator_match_rule_count: 6,
    });
  });
  test('can succeed when metrics response has no aggregation response', async () => {
    const stubMetricResponses = {
      listMetricsResponse: {},
      itemMetricsResponse: {},
      exceptionListMetricsResponse: {},
      indicatorMatchMetricsResponse: {},
    };
    // @ts-ignore
    const response = formatValueListMetaData(stubMetricResponses, stubClusterInfo, stubLicenseInfo);
    expect(response).toEqual({
      '@timestamp': '2023-01-30T00:00:00.000Z',
      cluster_uuid: '5Pr5PXRQQpGJUTn0czAvKQ',
      cluster_name: 'elasticsearch',
      license_id: '4a7dde08-e5f8-4e50-80f8-bc85b72b4934',
      total_list_count: 0,
      types: [],
      lists: [],
      included_in_exception_lists_count: 0,
      used_in_indicator_match_rule_count: 0,
    });
  });
});

describe('test tlog', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
  });

  test('should log when cloud', () => {
    setIsElasticCloudDeployment(true);
    tlog(logger, 'test');
    expect(logger.info).toHaveBeenCalled();
    setIsElasticCloudDeployment(false);
  });

  test('should NOT log when on prem', () => {
    tlog(logger, 'test');
    expect(logger.info).toHaveBeenCalledTimes(0);
    expect(logger.debug).toHaveBeenCalled();
  });
});

// FLAKY: https://github.com/elastic/kibana/issues/141356
describe.skip('test create task metrics', () => {
  test('can succeed when all parameters are given', async () => {
    const stubTaskName = 'test';
    const stubPassed = true;
    const stubStartTime = Date.now();
    await new Promise((r) => setTimeout(r, 11));
    const response = createTaskMetric(stubTaskName, stubPassed, stubStartTime);
    const {
      time_executed_in_ms: timeExecutedInMs,
      start_time: startTime,
      end_time: endTime,
      ...rest
    } = response;
    expect(timeExecutedInMs).toBeGreaterThan(10);
    expect(rest).toEqual({
      name: 'test',
      passed: true,
    });
  });
  test('can succeed when error given', async () => {
    const stubTaskName = 'test';
    const stubPassed = false;
    const stubStartTime = Date.now();
    const errorMessage = 'failed';
    const response = createTaskMetric(stubTaskName, stubPassed, stubStartTime, errorMessage);
    const {
      time_executed_in_ms: timeExecutedInMs,
      start_time: startTime,
      end_time: endTime,
      ...rest
    } = response;
    expect(rest).toEqual({
      name: 'test',
      passed: false,
      error_message: 'failed',
    });
  });
});
