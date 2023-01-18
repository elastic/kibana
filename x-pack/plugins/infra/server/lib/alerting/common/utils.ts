/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isError } from 'lodash';
import { schema } from '@kbn/config-schema';
import { Logger, LogMeta } from '@kbn/logging';
import type { ElasticsearchClient, IBasePath } from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';
import { ObservabilityConfig } from '@kbn/observability-plugin/server';
import { ALERT_RULE_PARAMETERS, TIMESTAMP } from '@kbn/rule-data-utils';
import { ParsedTechnicalFields, parseTechnicalFields } from '@kbn/rule-registry-plugin/common/parse_technical_fields';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { set } from '@kbn/safer-lodash-set';
import { LINK_TO_METRICS_EXPLORER } from '../../../../common/alerting/metrics';
import { getInventoryViewInAppUrl } from '../../../../common/alerting/metrics/alert_link';
import {
  AlertExecutionDetails,
  InventoryMetricConditions,
} from '../../../../common/alerting/metrics/types';
import { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';

const ALERT_CONTEXT_CONTAINER = 'container';
const ALERT_CONTEXT_ORCHESTRATOR = 'orchestrator';
const ALERT_CONTEXT_CLOUD = 'cloud';
const ALERT_CONTEXT_HOST = 'host';
const ALERT_CONTEXT_LABELS = 'labels';
const ALERT_CONTEXT_TAGS = 'tags';

const HOST_NAME = 'host.name';
const HOST_HOSTNAME = 'host.hostname';
const HOST_ID = 'host.id';
const CONTAINER_ID = 'container.id';

const SUPPORTED_ES_FIELD_TYPES = [
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.BOOLEAN,
];

export const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>
  schema.string({
    validate: (value) =>
      arrayOfLiterals.includes(value) ? undefined : `must be one of ${arrayOfLiterals.join(' | ')}`,
  });

export const validateIsStringElasticsearchJSONFilter = (value: string) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  const errorMessage = 'filterQuery must be a valid Elasticsearch filter expressed in JSON';
  try {
    const parsedValue = JSON.parse(value);
    if (!isEmpty(parsedValue.bool)) {
      return undefined;
    }
    return errorMessage;
  } catch (e) {
    return errorMessage;
  }
};

export const UNGROUPED_FACTORY_KEY = '*';

export const createScopedLogger = (
  logger: Logger,
  scope: string,
  alertExecutionDetails: AlertExecutionDetails
): Logger => {
  const scopedLogger = logger.get(scope);
  const fmtMsg = (msg: string) =>
    `[AlertId: ${alertExecutionDetails.alertId}][ExecutionId: ${alertExecutionDetails.executionId}] ${msg}`;
  return {
    ...scopedLogger,
    info: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.info(fmtMsg(msg), meta),
    debug: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.debug(fmtMsg(msg), meta),
    trace: <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) =>
      scopedLogger.trace(fmtMsg(msg), meta),
    warn: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.warn(errorOrMessage, meta);
      } else {
        scopedLogger.warn(fmtMsg(errorOrMessage), meta);
      }
    },
    error: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.error(errorOrMessage, meta);
      } else {
        scopedLogger.error(fmtMsg(errorOrMessage), meta);
      }
    },
    fatal: <Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta) => {
      if (isError(errorOrMessage)) {
        scopedLogger.fatal(errorOrMessage, meta);
      } else {
        scopedLogger.fatal(fmtMsg(errorOrMessage), meta);
      }
    },
  };
};

export const getAlertDetailsPageEnabledForApp = (
  config: ObservabilityConfig['unsafe']['alertDetails'] | null,
  appName: keyof ObservabilityConfig['unsafe']['alertDetails']
): boolean => {
  if (!config) return false;

  return config[appName].enabled;
};

export const getViewInInventoryAppUrl = ({
  basePath,
  criteria,
  nodeType,
  spaceId,
  timestamp,
}: {
  basePath: IBasePath;
  criteria: InventoryMetricConditions[];
  nodeType: string;
  spaceId: string;
  timestamp: string;
}) => {
  const { metric, customMetric } = criteria[0];

  const fields = {
    [`${ALERT_RULE_PARAMETERS}.criteria.metric`]: [metric],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.id`]: [customMetric?.id],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.aggregation`]: [customMetric?.aggregation],
    [`${ALERT_RULE_PARAMETERS}.criteria.customMetric.field`]: [customMetric?.field],
    [`${ALERT_RULE_PARAMETERS}.nodeType`]: [nodeType],
    [TIMESTAMP]: timestamp,
  };

  return addSpaceIdToPath(
    basePath.publicBaseUrl,
    spaceId,
    getInventoryViewInAppUrl(parseTechnicalFields(fields, true))
  );
};

export const getViewInMetricsAppUrl = (basePath: IBasePath, spaceId: string) =>
  addSpaceIdToPath(basePath.publicBaseUrl, spaceId, LINK_TO_METRICS_EXPLORER);

export const getAlertDetailsUrl = (
  basePath: IBasePath,
  spaceId: string,
  alertUuid: string | null
) => addSpaceIdToPath(basePath.publicBaseUrl, spaceId, `/app/observability/alerts/${alertUuid}`);

export const KUBERNETES_POD_UID = 'kubernetes.pod.uid';
export const NUMBER_OF_DOCUMENTS = 10;
export const termsAggField: Record<string, string> = { [KUBERNETES_POD_UID]: CONTAINER_ID };

export interface AdditionalContext {
  [x: string]: any;
}

export const doFieldsExist = async (
  esClient: ElasticsearchClient,
  fields: string[],
  index: string
): Promise<Record<string, boolean>> => {
  // Get all supported fields
  const respMapping = await esClient.fieldCaps({
    index,
    fields: '*',
  });

  const fieldsExisted: Record<string, boolean> = {};
  const acceptableFields: Set<string> = new Set();

  Object.entries(respMapping.fields).forEach(([key, value]) => {
    const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
    const isSupportedType = fieldTypes.some((type) => SUPPORTED_ES_FIELD_TYPES.includes(type));

    // Check if fieldName is something we can aggregate on
    if (isSupportedType) {
      acceptableFields.add(key);
    }
  });

  fields.forEach((field) => {
    fieldsExisted[field] = acceptableFields.has(field);
  });

  return fieldsExisted;
};

export const validGroupByForContext: string[] = [
  HOST_NAME,
  HOST_HOSTNAME,
  HOST_ID,
  KUBERNETES_POD_UID,
  CONTAINER_ID,
];

export const hasAdditionalContext = (
  groupBy: string | string[] | undefined,
  validGroups: string[]
): boolean => {
  return groupBy
    ? Array.isArray(groupBy)
      ? groupBy.every((group) => validGroups.includes(group))
      : validGroups.includes(groupBy)
    : false;
};

export const shouldTermsAggOnContainer = (groupBy: string | string[] | undefined) => {
  return groupBy && Array.isArray(groupBy)
    ? groupBy.includes(KUBERNETES_POD_UID)
    : groupBy === KUBERNETES_POD_UID;
};

export const flattenAdditionalContext = (
  additionalContext: AdditionalContext | undefined | null
): AdditionalContext => {
  let flattenedContext: AdditionalContext = {};
  if (additionalContext) {
    Object.keys(additionalContext).forEach((context: string) => {
      if (additionalContext[context]) {
        flattenedContext = {
          ...flattenedContext,
          ...flattenObject(additionalContext[context], [context + '.']),
        };
      }
    });
  }
  return flattenedContext;
};

export const getContextForRecoveredAlerts = (
  alertHitSource: Partial<ParsedTechnicalFields & ParsedExperimentalFields> | undefined | null
): AdditionalContext => {
  const alert = alertHitSource ? unflattenObject(alertHitSource) : undefined

  return {
    cloud: alert?.[ALERT_CONTEXT_CLOUD],
    host: alert?.[ALERT_CONTEXT_HOST],
    orchestrator: alert?.[ALERT_CONTEXT_ORCHESTRATOR],
    container: alert?.[ALERT_CONTEXT_CONTAINER],
    labels: alert?.[ALERT_CONTEXT_LABELS],
    tags: alert?.[ALERT_CONTEXT_TAGS],
  };
};

export const unflattenObject = <T extends object = AdditionalContext>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

/**
 * Wrap the key with [] if it is a key from an Array
 * @param key The object key
 * @param isArrayItem Flag to indicate if it is the key of an Array
 */
const renderKey = (key: string, isArrayItem: boolean): string => (isArrayItem ? `[${key}]` : key);

export const flattenObject = (
  obj: AdditionalContext,
  prefix: string[] = [],
  isArrayItem = false
): AdditionalContext =>
  Object.keys(obj).reduce<AdditionalContext>((acc, k) => {
    const nextValue = obj[k];

    if (typeof nextValue === 'object' && nextValue !== null) {
      const isNextValueArray = Array.isArray(nextValue);
      const dotSuffix = isNextValueArray ? '' : '.';

      if (Object.keys(nextValue).length > 0) {
        return {
          ...acc,
          ...flattenObject(
            nextValue,
            [...prefix, `${renderKey(k, isArrayItem)}${dotSuffix}`],
            isNextValueArray
          ),
        };
      }
    }

    const fullPath = `${prefix.join('')}${renderKey(k, isArrayItem)}`;
    acc[fullPath] = nextValue;

    return acc;
  }, {});

export const getGroupByObject = (
  groupBy: string | string[] | undefined,
  resultGroupSet: Set<string>
): Record<string, object> => {
  const groupByKeysObjectMapping: Record<string, object> = {};
  if (groupBy) {
    resultGroupSet.forEach((groupSet) => {
      const groupSetKeys = groupSet.split(',');
      groupByKeysObjectMapping[groupSet] = unflattenObject(
        Array.isArray(groupBy)
          ? groupBy.reduce((result, group, index) => {
              return { ...result, [group]: groupSetKeys[index]?.trim() };
            }, {})
          : { [groupBy]: groupSet }
      );
    });
  }
  return groupByKeysObjectMapping;
};
