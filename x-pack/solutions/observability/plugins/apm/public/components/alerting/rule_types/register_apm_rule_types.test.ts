/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_REASON, ApmRuleType } from '@kbn/rule-data-utils';
import type {
  ObservabilityRuleTypeFormatter,
  ObservabilityRuleTypeModel,
  ObservabilityRuleTypeRegistry,
} from '@kbn/observability-plugin/public';
import { registerApmRuleTypes } from './register_apm_rule_types';

const SERVICE_ENVIRONMENT = 'service.environment';
const SERVICE_NAME = 'service.name';
const TRANSACTION_TYPE = 'transaction.type';

const SERVICE_NAME_VALUE = 'some_service_name';
const SERVICE_ENVIRONMENT_VALUE = 'prod';
const TRANSACTION_TYPE_VALUE = 'request';
const ALERT_REASON_VALUE = 'latency is anomalous';

type AlertFields = Parameters<ObservabilityRuleTypeFormatter>[0]['fields'];
type FieldValue = string | string[] | Array<string | null | undefined> | null | undefined;

const formatters: Parameters<ObservabilityRuleTypeFormatter>[0]['formatters'] = {
  asDuration: () => '',
  asPercent: () => '',
};

const ENVIRONMENT_ALL_VALUE = 'ENVIRONMENT_ALL';
const expectedErrorCountLink = `/app/apm/services/${SERVICE_NAME_VALUE}/errors?environment=${SERVICE_ENVIRONMENT_VALUE}`;
const expectedTransactionLink = `/app/apm/services/${SERVICE_NAME_VALUE}?transactionType=${TRANSACTION_TYPE_VALUE}&environment=${SERVICE_ENVIRONMENT_VALUE}`;
const expectedErrorCountLinkAllEnvs = `/app/apm/services/${SERVICE_NAME_VALUE}/errors?environment=${ENVIRONMENT_ALL_VALUE}`;
const expectedTransactionLinkAllEnvs = `/app/apm/services/${SERVICE_NAME_VALUE}?transactionType=${TRANSACTION_TYPE_VALUE}&environment=${ENVIRONMENT_ALL_VALUE}`;
const expectedTransactionLinkMissingTxType = `/app/apm/services/${SERVICE_NAME_VALUE}?transactionType=&environment=${SERVICE_ENVIRONMENT_VALUE}`;
const expectedErrorCountLinkMissingService = `/app/apm/services?environment=${SERVICE_ENVIRONMENT_VALUE}`;
const expectedTransactionLinkMissingService = `/app/apm/services?transactionType=${TRANSACTION_TYPE_VALUE}&environment=${SERVICE_ENVIRONMENT_VALUE}`;

const transactionRuleTypes = [
  ApmRuleType.TransactionDuration,
  ApmRuleType.TransactionErrorRate,
  ApmRuleType.Anomaly,
] as const;

const allRuleTypes = [ApmRuleType.ErrorCount, ...transactionRuleTypes] as const;

const missingFieldValues: Array<[string, FieldValue]> = [
  ['undefined', undefined],
  ['null', null],
  ['[]', []],
  ['[null]', [null]],
  ['[undefined]', [undefined]],
];

const createRegistry = () => {
  const types: ObservabilityRuleTypeModel[] = [];
  const registry = {
    register: (type: ObservabilityRuleTypeModel) => {
      types.push(type);
    },
    getFormatter: (typeId: string) => types.find((type) => type.id === typeId)?.format,
    list: () => types.map((type) => type.id),
  } as ObservabilityRuleTypeRegistry;

  return { registry, types };
};

const formatAlert = (
  formatter: ObservabilityRuleTypeFormatter | undefined,
  fields: Record<string, FieldValue>
) => {
  if (!formatter) {
    throw new Error('Missing formatter');
  }
  return formatter({
    fields: fields as unknown as AlertFields,
    formatters,
  });
};

describe('registerApmRuleTypes formatters', () => {
  let types: ObservabilityRuleTypeModel[];

  beforeAll(() => {
    const created = createRegistry();
    registerApmRuleTypes(created.registry);
    types = created.types;
  });

  const getFormatter = (ruleTypeId: ApmRuleType) =>
    types.find((type) => type.id === ruleTypeId)?.format;

  describe('when fields are scalars (platform View in App hook)', () => {
    const scalarFields = {
      [ALERT_REASON]: ALERT_REASON_VALUE,
      [SERVICE_NAME]: SERVICE_NAME_VALUE,
      [SERVICE_ENVIRONMENT]: SERVICE_ENVIRONMENT_VALUE,
      [TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE,
    };

    it.each([
      [ApmRuleType.ErrorCount, expectedErrorCountLink],
      [ApmRuleType.TransactionDuration, expectedTransactionLink],
      [ApmRuleType.TransactionErrorRate, expectedTransactionLink],
      [ApmRuleType.Anomaly, expectedTransactionLink],
    ])('%s keeps full service/environment/transaction.type values', (ruleTypeId, expectedLink) => {
      expect(formatAlert(getFormatter(ruleTypeId), scalarFields).link).toBe(expectedLink);
    });
  });

  describe('when fields are single-element arrays (Elasticsearch hits)', () => {
    const arrayFields = {
      [ALERT_REASON]: [ALERT_REASON_VALUE],
      [SERVICE_NAME]: [SERVICE_NAME_VALUE],
      [SERVICE_ENVIRONMENT]: [SERVICE_ENVIRONMENT_VALUE],
      [TRANSACTION_TYPE]: [TRANSACTION_TYPE_VALUE],
    };

    it.each([
      [ApmRuleType.ErrorCount, expectedErrorCountLink],
      [ApmRuleType.TransactionDuration, expectedTransactionLink],
      [ApmRuleType.TransactionErrorRate, expectedTransactionLink],
      [ApmRuleType.Anomaly, expectedTransactionLink],
    ])('%s keeps full service/environment/transaction.type values', (ruleTypeId, expectedLink) => {
      expect(formatAlert(getFormatter(ruleTypeId), arrayFields).link).toBe(expectedLink);
    });
  });

  describe('when fields are undefined, null, or empty arrays', () => {
    describe('missing service.environment', () => {
      it.each(missingFieldValues)(
        'falls back to ENVIRONMENT_ALL when environment is %s',
        (_label, environment) => {
          const fields = {
            [ALERT_REASON]: ALERT_REASON_VALUE,
            [SERVICE_NAME]: SERVICE_NAME_VALUE,
            [SERVICE_ENVIRONMENT]: environment,
            [TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE,
          };

          expect(formatAlert(getFormatter(ApmRuleType.ErrorCount), fields).link).toBe(
            expectedErrorCountLinkAllEnvs
          );

          for (const ruleTypeId of transactionRuleTypes) {
            expect(formatAlert(getFormatter(ruleTypeId), fields).link).toBe(
              expectedTransactionLinkAllEnvs
            );
          }
        }
      );
    });

    describe('missing transaction.type', () => {
      it.each(missingFieldValues)(
        'keeps the service name and uses an empty transactionType when transaction.type is %s',
        (_label, transactionType) => {
          const fields = {
            [ALERT_REASON]: ALERT_REASON_VALUE,
            [SERVICE_NAME]: SERVICE_NAME_VALUE,
            [SERVICE_ENVIRONMENT]: SERVICE_ENVIRONMENT_VALUE,
            [TRANSACTION_TYPE]: transactionType,
          };

          expect(formatAlert(getFormatter(ApmRuleType.ErrorCount), fields).link).toBe(
            expectedErrorCountLink
          );

          for (const ruleTypeId of transactionRuleTypes) {
            expect(formatAlert(getFormatter(ruleTypeId), fields).link).toBe(
              expectedTransactionLinkMissingTxType
            );
          }
        }
      );
    });

    describe('missing service.name', () => {
      it.each(missingFieldValues)(
        'does not throw when service.name is %s',
        (_label, serviceName) => {
          const fields = {
            [ALERT_REASON]: ALERT_REASON_VALUE,
            [SERVICE_NAME]: serviceName,
            [SERVICE_ENVIRONMENT]: SERVICE_ENVIRONMENT_VALUE,
            [TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE,
          };

          for (const ruleTypeId of allRuleTypes) {
            expect(() => formatAlert(getFormatter(ruleTypeId), fields)).not.toThrow();
          }
        }
      );

      it.each(missingFieldValues)(
        'links to the service inventory when service.name is %s',
        (_label, serviceName) => {
          const fields = {
            [ALERT_REASON]: ALERT_REASON_VALUE,
            [SERVICE_NAME]: serviceName,
            [SERVICE_ENVIRONMENT]: SERVICE_ENVIRONMENT_VALUE,
            [TRANSACTION_TYPE]: TRANSACTION_TYPE_VALUE,
          };

          expect(formatAlert(getFormatter(ApmRuleType.ErrorCount), fields).link).toBe(
            expectedErrorCountLinkMissingService
          );

          for (const ruleTypeId of transactionRuleTypes) {
            expect(formatAlert(getFormatter(ruleTypeId), fields).link).toBe(
              expectedTransactionLinkMissingService
            );
          }
        }
      );
    });
  });
});
