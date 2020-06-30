/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { get } from 'lodash';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatProductName, getIdentifier } from './formatting';

const MIGRATE_TO_MB_LABEL = i18n.translate('xpack.monitoring.setupMode.migrateToMetricbeat', {
  defaultMessage: 'Monitor with Metricbeat',
});

export function ListingCallOut({ setupModeData, productName, customRenderer = null }) {
  if (customRenderer) {
    const { shouldRender, componentToRender } = customRenderer();
    if (shouldRender) {
      return componentToRender;
    }
  }

  const mightExist = get(setupModeData, 'detected.mightExist');

  const hasInstances = setupModeData.totalUniqueInstanceCount > 0;
  if (!hasInstances) {
    if (mightExist) {
      return (
        <Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.setupMode.detectedNodeTitle', {
              defaultMessage: '{product} {identifier} detected',
              values: {
                product: formatProductName(productName),
                identifier: getIdentifier(productName),
              },
            })}
            color="warning"
            iconType="flag"
          >
            <p>
              {i18n.translate('xpack.monitoring.setupMode.detectedNodeDescription', {
                defaultMessage: `Click 'Set up monitoring' below to start monitoring this {identifier}.`,
                values: {
                  identifier: getIdentifier(productName),
                },
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </Fragment>
      );
    }
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.noMonitoringDataFound', {
            defaultMessage: 'No {product} {identifier} detected',
            values: {
              product: formatProductName(productName),
              identifier: getIdentifier(productName, true),
            },
          })}
          iconType="flag"
        >
          <p>
            {i18n.translate('xpack.monitoring.setupMode.netNewUserDescription', {
              defaultMessage: `Click 'Set up monitoring' to start monitoring with Metricbeat.`,
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  if (setupModeData.totalUniqueFullyMigratedCount === setupModeData.totalUniqueInstanceCount) {
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.metricbeatAllNodes', {
            defaultMessage: 'Metricbeat is monitoring all {identifier}.',
            values: {
              identifier: getIdentifier(productName, true),
            },
          })}
          color="success"
          iconType="flag"
        />
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  if (setupModeData.totalUniquePartiallyMigratedCount === setupModeData.totalUniqueInstanceCount) {
    return (
      <Fragment>
        <EuiCallOut
          title={i18n.translate('xpack.monitoring.setupMode.disableInternalCollectionTitle', {
            defaultMessage: 'Disable self monitoring',
          })}
          color="warning"
          iconType="flag"
        >
          <p>
            {i18n.translate('xpack.monitoring.setupMode.disableInternalCollectionDescription', {
              defaultMessage: `Metricbeat is now monitoring your {product} {identifier}. Disable self monitoring to finish the migration.`,
              values: {
                product: formatProductName(productName),
                identifier: getIdentifier(productName, true),
              },
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  if (setupModeData.totalUniqueInstanceCount > 0) {
    if (
      setupModeData.totalUniqueFullyMigratedCount === 0 &&
      setupModeData.totalUniquePartiallyMigratedCount === 0
    ) {
      return (
        <Fragment>
          <EuiCallOut title={MIGRATE_TO_MB_LABEL} color="danger" iconType="flag">
            <p>
              {i18n.translate('xpack.monitoring.setupMode.migrateToMetricbeatDescription', {
                defaultMessage: `These {product} {identifier} are self monitored.
                Click 'Monitor with Metricbeat' to migrate.`,
                values: {
                  product: formatProductName(productName),
                  identifier: getIdentifier(productName, true),
                },
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiCallOut title={MIGRATE_TO_MB_LABEL} color="danger" iconType="flag">
          <p>
            {i18n.translate('xpack.monitoring.setupMode.migrateSomeToMetricbeatDescription', {
              defaultMessage: `Some {product} {identifier} are monitored through self monitoring. Migrate to monitor with Metricbeat.`,
              values: {
                product: formatProductName(productName),
                identifier: getIdentifier(productName, true),
              },
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  return null;
}
