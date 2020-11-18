/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  CommonAlertFilter,
  CommonAlertParams,
  CommonAlertStackProductFilter,
  CommonAlertNodeUuidFilter,
} from '../../common/types/alerts';
import { AlertInstance } from '../../../alerts/server';
import {
  INDEX_PATTERN,
  ALERT_MISSING_MONITORING_DATA,
  ALERT_DETAILS,
} from '../../common/constants';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { AlertMessageTokenType, AlertSeverity } from '../../common/enums';
import { RawAlertInstance, SanitizedAlert } from '../../../alerts/common';
import { parseDuration } from '../../../alerts/common/parse_duration';
import { appendMetricbeatIndex } from '../lib/alerts/append_mb_index';
import { fetchMissingMonitoringData } from '../lib/alerts/fetch_missing_monitoring_data';
import { getTypeLabelForStackProduct } from '../lib/alerts/get_type_label_for_stack_product';
import { getListingLinkForStackProduct } from '../lib/alerts/get_listing_link_for_stack_product';
import { getStackProductLabel } from '../lib/alerts/get_stack_product_label';
import { AlertingDefaults, createLink } from './alert_helpers';
import { Globals } from '../static_globals';

// Go a bit farther back because we need to detect the difference between seeing the monitoring data versus just not looking far enough back
const LIMIT_BUFFER = 3 * 60 * 1000;

interface MissingDataParams {
  duration: string;
  limit: string;
}

export class MissingMonitoringDataAlert extends BaseAlert {
  constructor(public rawAlert?: SanitizedAlert) {
    super(rawAlert, {
      id: ALERT_MISSING_MONITORING_DATA,
      name: ALERT_DETAILS[ALERT_MISSING_MONITORING_DATA].label,
      defaultParams: {
        duration: '15m',
        limit: '1d',
      },
      throttle: '6h',
      actionVariables: [
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
      ],
    });
  }

  protected async fetchData(
    params: CommonAlertParams,
    callCluster: any,
    clusters: AlertCluster[],
    availableCcs: string[]
  ): Promise<AlertData[]> {
    let indexPattern = appendMetricbeatIndex(Globals.app.config, INDEX_PATTERN);
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
      Globals.app.config.ui.max_bucket_size,
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
    const { missing } = item.meta as { missing: AlertMissingData; limit: number };
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

      const ccs = instanceState.alertStates.find((state) => state.ccs)?.ccs;
      const globalStateLink = this.createGlobalStateLink('overview', cluster.clusterUuid, ccs);
      const action = `[${fullActionText}](${globalStateLink})`;
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
        internalFullMessage: Globals.app.isCloud ? internalShortMessage : internalFullMessage,
        state: AlertingDefaults.ALERT_STATE.firing,
        stackProducts: firingStackProducts,
        count: firingCount,
        clusterName: cluster.clusterName,
        action,
        actionPlain: shortActionText,
      });
    }
  }
}
