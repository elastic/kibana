/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IUiSettingsClient, Logger } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { BaseAlert } from './base_alert';
import {
  AlertData,
  AlertCluster,
  AlertState,
  AlertMessage,
  AlertMissingDataState,
  AlertMissingData,
  AlertMessageTimeToken,
  AlertInstanceState,
} from './types';
import { AlertInstance, AlertServices } from '../../../alerts/server';
import {
  INDEX_PATTERN,
  ALERT_MISSING_MONITORING_DATA,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity, AlertParamType } from '../../common/enums';
import { RawAlertInstance } from '../../../alerts/common';
import { parseDuration } from '../../../alerts/common/parse_duration';
import {
  CommonAlertFilter,
  CommonAlertParams,
  CommonAlertParamDetail,
  CommonAlertStackProductFilter,
  CommonAlertNodeUuidFilter,
} from '../../common/types';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchMissingMonitoringData } from '../lib/alerts/fetch_missing_monitoring_data';
import { getTypeLabelForStackProduct } from '../lib/alerts/get_type_label_for_stack_product';
import { getListingLinkForStackProduct } from '../lib/alerts/get_listing_link_for_stack_product';
import { getStackProductLabel } from '../lib/alerts/get_stack_product_label';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { AlertingDefaults, createLink } from './alerts_common';

const RESOLVED = i18n.translate('xpack.monitoring.alerts.missingData.resolved', {
  defaultMessage: 'resolved',
});
const FIRING = i18n.translate('xpack.monitoring.alerts.missingData.firing', {
  defaultMessage: 'firing',
});

const DEFAULT_DURATION = '5m';
const DEFAULT_LIMIT = '1d';

// Go a bit farther back because we need to detect the difference between seeing the monitoring data versus just not looking far enough back
const LIMIT_BUFFER = 3 * 60 * 1000;

interface MissingDataParams {
  duration: string;
  limit: string;
}

export class MissingMonitoringDataAlert extends BaseAlert {
  public static paramDetails = {
    duration: {
      label: i18n.translate('xpack.monitoring.alerts.missingData.paramDetails.duration.label', {
        defaultMessage: `Notify if monitoring data is missing for`,
      }),
      type: AlertParamType.Duration,
    } as CommonAlertParamDetail,
    limit: {
      label: i18n.translate('xpack.monitoring.alerts.missingData.paramDetails.limit.label', {
        defaultMessage: `Look this far back in time for monitoring data`,
      }),
      type: AlertParamType.Duration,
    } as CommonAlertParamDetail,
  };

  public type = ALERT_MISSING_MONITORING_DATA;
  public label = i18n.translate('xpack.monitoring.alerts.missingData.label', {
    defaultMessage: 'Missing monitoring data',
  });

  protected defaultParams: MissingDataParams = {
    duration: DEFAULT_DURATION,
    limit: DEFAULT_LIMIT,
  };

  protected actionVariables = [
    {
      name: 'stackProducts',
      description: i18n.translate(
        'xpack.monitoring.alerts.missingData.actionVariables.stackProducts',
        {
          defaultMessage: 'The stack products missing monitoring data.',
        }
      ),
    },
    {
      name: 'count',
      description: i18n.translate('xpack.monitoring.alerts.missingData.actionVariables.count', {
        defaultMessage: 'The number of stack products missing monitoring data.',
      }),
    },
    ...Object.values(AlertingDefaults.ALERT_TYPE.context),
  ];

  protected async fetchClusters(
    callCluster: any,
    availableCcs: string[] | undefined = undefined,
    params: CommonAlertParams
  ) {
    const limit = parseDuration(((params as unknown) as MissingDataParams).limit);
    let ccs;
    if (!availableCcs) {
      ccs = this.config.ui.ccs.enabled ? await fetchAvailableCcs(callCluster) : undefined;
    } else {
      ccs = availableCcs;
    }
    // Support CCS use cases by querying to find available remote clusters
    // and then adding those to the index pattern we are searching against
    let esIndexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN_ELASTICSEARCH);
    if (ccs) {
      esIndexPattern = getCcsIndexPattern(esIndexPattern, ccs);
    }
    return await fetchClusters(callCluster, esIndexPattern, {
      timestamp: {
        format: 'epoch_millis',
        gte: limit - LIMIT_BUFFER,
      },
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    uiSettings: IUiSettingsClient,
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let indexPattern = appendMetricbeatIndex(this.config, INDEX_PATTERN);
    if (availableCcs) {
      indexPattern = getCcsIndexPattern(indexPattern, availableCcs);
    }
    const duration = parseDuration(((params as unknown) as MissingDataParams).duration);
    const limit = parseDuration(((params as unknown) as MissingDataParams).limit);
    const now = +new Date();
    const missingData = await fetchMissingMonitoringData(
      callCluster,
      clusters,
      indexPattern,
      this.config.ui.max_bucket_size,
      now,
      now - limit - LIMIT_BUFFER
    );
    return missingData.map((missing) => {
      return {
        instanceKey: `${missing.clusterUuid}:${missing.stackProduct}:${missing.stackProductUuid}`,
        clusterUuid: missing.clusterUuid,
        shouldFire: missing.gapDuration > duration,
        severity: AlertSeverity.Danger,
        meta: { missing, limit },
        ccs: missing.ccs,
      };
    });
  }

  protected filterAlertInstance(alertInstance: RawAlertInstance, filters: CommonAlertFilter[]) {
    const alertInstanceState = (alertInstance.state as unknown) as AlertInstanceState;
    if (filters && filters.length) {
      for (const filter of filters) {
        const stackProductFilter = filter as CommonAlertStackProductFilter;
        if (stackProductFilter && stackProductFilter.stackProduct) {
          let existsInState = false;
          for (const state of alertInstanceState.alertStates) {
            if ((state as AlertMissingDataState).stackProduct === stackProductFilter.stackProduct) {
              existsInState = true;
              break;
            }
          }
          if (!existsInState) {
            return false;
          }
        }
      }
    }
    return true;
  }

  protected filterAlertState(alertState: AlertState, filters: CommonAlertFilter[]) {
    const state = alertState as AlertMissingDataState;
    if (filters && filters.length) {
      for (const filter of filters) {
        const stackProductFilter = filter as CommonAlertStackProductFilter;
        if (stackProductFilter && stackProductFilter.stackProduct) {
          if (state.stackProduct !== stackProductFilter.stackProduct) {
            return false;
          }
        }

        const nodeUuidFilter = filter as CommonAlertNodeUuidFilter;
        if (nodeUuidFilter && nodeUuidFilter.nodeUuid) {
          if (state.stackProductUuid !== nodeUuidFilter.nodeUuid) {
            return false;
          }
        }
      }
    }
    return true;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    const base = super.getDefaultAlertState(cluster, item);
    return {
      ...base,
      ui: {
        ...base.ui,
        severity: AlertSeverity.Danger,
      },
    };
  }

  protected getUiMessage(alertState: AlertState, item: AlertData): AlertMessage {
    const { missing, limit } = item.meta as { missing: AlertMissingData; limit: number };
    if (!alertState.ui.isFiring) {
      if (missing.gapDuration > limit) {
        return {
          text: i18n.translate('xpack.monitoring.alerts.missingData.ui.notQuiteResolvedMessage', {
            defaultMessage: `We are still not seeing monitoring data for the {stackProduct} {type}: {stackProductName} and will stop trying. To change this, configure the alert to look farther back for data.`,
            values: {
              stackProduct: getStackProductLabel(missing.stackProduct),
              type: getTypeLabelForStackProduct(missing.stackProduct, false),
              stackProductName: missing.stackProductName,
            },
          }),
        };
      }
      return {
        text: i18n.translate('xpack.monitoring.alerts.missingData.ui.resolvedMessage', {
          defaultMessage: `We are now seeing monitoring data for the {stackProduct} {type}: {stackProductName}, as of #resolved`,
          values: {
            stackProduct: getStackProductLabel(missing.stackProduct),
            type: getTypeLabelForStackProduct(missing.stackProduct, false),
            stackProductName: missing.stackProductName,
          },
        }),
        tokens: [
          {
            startToken: '#resolved',
            type: AlertMessageTokenType.Time,
            isAbsolute: true,
            isRelative: false,
            timestamp: alertState.ui.resolvedMS,
          } as AlertMessageTimeToken,
        ],
      };
    }
    return {
      text: i18n.translate('xpack.monitoring.alerts.missingData.ui.firingMessage', {
        defaultMessage: `For the past {gapDuration}, we have not detected any monitoring data from the {stackProduct} {type}: {stackProductName}, starting at #absolute`,
        values: {
          gapDuration: moment.duration(missing.gapDuration, 'milliseconds').humanize(),
          stackProduct: getStackProductLabel(missing.stackProduct),
          type: getTypeLabelForStackProduct(missing.stackProduct, false),
          stackProductName: missing.stackProductName,
        },
      }),
      nextSteps: [
        createLink(
          i18n.translate('xpack.monitoring.alerts.missingData.ui.nextSteps.viewAll', {
            defaultMessage: `#start_linkView all {stackProduct} {type}#end_link`,
            values: {
              type: getTypeLabelForStackProduct(missing.stackProduct),
              stackProduct: getStackProductLabel(missing.stackProduct),
            },
          }),
          getListingLinkForStackProduct(missing.stackProduct),
          AlertMessageTokenType.Link
        ),
        {
          text: i18n.translate('xpack.monitoring.alerts.missingData.ui.nextSteps.verifySettings', {
            defaultMessage: `Verify monitoring settings on the {type}`,
            values: {
              type: getTypeLabelForStackProduct(missing.stackProduct, false),
            },
          }),
        },
      ],
      tokens: [
        {
          startToken: '#absolute',
          type: AlertMessageTokenType.Time,
          isAbsolute: true,
          isRelative: false,
          timestamp: alertState.ui.triggeredMS,
        } as AlertMessageTimeToken,
      ],
    };
  }

  protected executeActions(
    instance: AlertInstance,
    instanceState: AlertInstanceState,
    item: AlertData | null,
    cluster: AlertCluster
  ) {
    if (instanceState.alertStates.length === 0) {
      return;
    }

    const ccs = instanceState.alertStates.reduce((accum: string, state): string => {
      if (state.ccs) {
        return state.ccs;
      }
      return accum;
    }, '');

    const firingCount = instanceState.alertStates.filter((alertState) => alertState.ui.isFiring)
      .length;
    const firingStackProducts = instanceState.alertStates
      .filter((_state) => (_state as AlertMissingDataState).ui.isFiring)
      .map((_state) => {
        const state = _state as AlertMissingDataState;
        return `${getStackProductLabel(state.stackProduct)} ${getTypeLabelForStackProduct(
          state.stackProduct,
          false
        )}: ${state.stackProductName}`;
      })
      .join(', ');
    if (firingCount > 0) {
      const shortActionText = i18n.translate('xpack.monitoring.alerts.missingData.shortAction', {
        defaultMessage:
          'Verify these stack products are up and running, then double check the monitoring settings.',
      });
      const fullActionText = i18n.translate('xpack.monitoring.alerts.missingData.fullAction', {
        defaultMessage: 'View what monitoring data we do have for these stack products.',
      });
      const globalState = [`cluster_uuid:${cluster.clusterUuid}`];
      if (ccs) {
        globalState.push(`ccs:${ccs}`);
      }
      const url = `${this.kibanaUrl}/app/monitoring#overview?_g=(${globalState.join(',')})`;
      const action = `[${fullActionText}](${url})`;
      const internalShortMessage = i18n.translate(
        'xpack.monitoring.alerts.missingData.firing.internalShortMessage',
        {
          defaultMessage: `We have not detected any monitoring data for {count} stack product(s) in cluster: {clusterName}. {shortActionText}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            shortActionText,
          },
        }
      );
      const internalFullMessage = i18n.translate(
        'xpack.monitoring.alerts.missingData.firing.internalFullMessage',
        {
          defaultMessage: `We have not detected any monitoring data for {count} stack product(s) in cluster: {clusterName}. {action}`,
          values: {
            count: firingCount,
            clusterName: cluster.clusterName,
            action,
          },
        }
      );
      instance.scheduleActions('default', {
        internalShortMessage,
        internalFullMessage: this.isCloud ? internalShortMessage : internalFullMessage,
        state: FIRING,
        stackProducts: firingStackProducts,
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    } else {
      const resolvedCount = instanceState.alertStates.filter(
        (alertState) => !alertState.ui.isFiring
      ).length;
      const resolvedStackProducts = instanceState.alertStates
        .filter((_state) => !(_state as AlertMissingDataState).ui.isFiring)
        .map((_state) => {
          const state = _state as AlertMissingDataState;
          return `${getStackProductLabel(state.stackProduct)} ${getTypeLabelForStackProduct(
            state.stackProduct,
            false
          )}: ${state.stackProductName}`;
        })
        .join(',');
      if (resolvedCount > 0) {
        instance.scheduleActions('default', {
          internalShortMessage: i18n.translate(
            'xpack.monitoring.alerts.missingData.resolved.internalShortMessage',
            {
              defaultMessage: `We are now seeing monitoring data for {count} stack product(s) in cluster: {clusterName}.`,
              values: {
                count: resolvedCount,
                clusterName: cluster.clusterName,
              },
            }
          ),
          internalFullMessage: i18n.translate(
            'xpack.monitoring.alerts.missingData.resolved.internalFullMessage',
            {
              defaultMessage: `We are now seeing monitoring data for {count} stack product(s) in cluster {clusterName}.`,
              values: {
                count: resolvedCount,
                clusterName: cluster.clusterName,
              },
            }
          ),
          state: RESOLVED,
          stackProducts: resolvedStackProducts,
          count: resolvedCount,
          clusterName: cluster.clusterName,
        });
      }
    }
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: AlertServices,
    logger: Logger
  ) {
    for (const cluster of clusters) {
      const stackProducts = data.filter((_item) => _item.clusterUuid === cluster.clusterUuid);
      if (stackProducts.length === 0) {
        continue;
      }

      const firingInstances = stackProducts.reduce((list: string[], stackProduct) => {
        const { missing } = stackProduct.meta as { missing: AlertMissingData; limit: number };
        if (stackProduct.shouldFire) {
          list.push(`${missing.stackProduct}:${missing.stackProductUuid}`);
        }
        return list;
      }, [] as string[]);
      firingInstances.sort(); // It doesn't matter how we sort, but keep the order consistent
      const instanceId = `${this.type}:${cluster.clusterUuid}:${firingInstances.join(',')}`;
      const instance = services.alertInstanceFactory(instanceId);
      const instanceState = (instance.getState() as unknown) as AlertInstanceState;
      const alertInstanceState: AlertInstanceState = {
        alertStates: instanceState?.alertStates || [],
      };
      let shouldExecuteActions = false;
      for (const stackProduct of stackProducts) {
        const { missing } = stackProduct.meta as { missing: AlertMissingData; limit: number };
        let state: AlertMissingDataState;
        const indexInState = alertInstanceState.alertStates.findIndex((alertState) => {
          const _alertState = alertState as AlertMissingDataState;
          return (
            _alertState.cluster.clusterUuid === cluster.clusterUuid &&
            _alertState.stackProduct === missing.stackProduct &&
            _alertState.stackProductUuid === missing.stackProductUuid
          );
        });
        if (indexInState > -1) {
          state = alertInstanceState.alertStates[indexInState] as AlertMissingDataState;
        } else {
          state = this.getDefaultAlertState(cluster, stackProduct) as AlertMissingDataState;
        }

        state.stackProduct = missing.stackProduct;
        state.stackProductUuid = missing.stackProductUuid;
        state.stackProductName = missing.stackProductName;
        state.gapDuration = missing.gapDuration;

        if (stackProduct.shouldFire) {
          if (!state.ui.isFiring) {
            state.ui.triggeredMS = new Date().valueOf();
          }
          state.ui.isFiring = true;
          state.ui.message = this.getUiMessage(state, stackProduct);
          state.ui.severity = stackProduct.severity;
          state.ui.resolvedMS = 0;
          shouldExecuteActions = true;
        } else if (!stackProduct.shouldFire && state.ui.isFiring) {
          state.ui.isFiring = false;
          state.ui.resolvedMS = new Date().valueOf();
          state.ui.message = this.getUiMessage(state, stackProduct);
          shouldExecuteActions = true;
        }

        if (indexInState === -1) {
          alertInstanceState.alertStates.push(state);
        } else {
          alertInstanceState.alertStates = [
            ...alertInstanceState.alertStates.slice(0, indexInState),
            state,
            ...alertInstanceState.alertStates.slice(indexInState + 1),
          ];
        }
      }

      instance.replaceState(alertInstanceState);
      if (shouldExecuteActions) {
        this.executeActions(instance, alertInstanceState, null, cluster);
      }
    }
  }
}
